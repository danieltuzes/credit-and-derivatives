/**
 * Multi-popup engine for the notation layer (see `NotationLayer.astro`).
 *
 * Unlike the single shared hover panel (`./hover-panel.ts`, used by the
 * citation layer, which never nests), notation cards nest: a card's formula
 * can itself carry live symbols (D15), and pointing at one is the reader
 * exploring outward, not navigating away — replacing the card they were just
 * reading with a different one is the wrong response to that. So this module
 * keeps a small stack of independent popup elements instead of one shared
 * panel: each key gets at most one open popup, opening a symbol found inside
 * an existing popup adds another popup beside it, closing a popup also
 * closes whatever was opened from inside it (nothing is left pointing at a
 * symbol that no longer exists), and every popup positions itself clear of
 * its trigger and of every other currently open popup.
 *
 * Because each key's popup is a real, persistent DOM node — never replaced
 * in place — this sidesteps the reentrancy problem an earlier "replace the
 * panel's content" design ran into: a `:hover` check made once the dust
 * settles is always accurate, there is no synthetic event fired by a node
 * removing itself out from under the pointer.
 */
import { claimActiveSurface, releaseActiveSurface } from './hover-panel';

export interface PopupStackConfig {
  /** Where popup elements are appended. They are `position: fixed`, so the
   *  parent's place in the document doesn't matter. */
  container: HTMLElement;
  /** Exclusivity group against other surfaces (e.g. the citation panel). */
  groupId: string;
  /**
   * Nearest interactive trigger for an event target — must search the live
   * document *and* the content of every currently open popup.
   */
  triggerFrom: (node: EventTarget | null) => HTMLElement | null;
  /** Stable key identifying what a trigger points at. */
  keyFor: (trigger: HTMLElement) => string | null;
  /** A pin toggle outside the popups themselves (e.g. a list button). */
  pinControlFrom?: (node: EventTarget | null) => HTMLElement | null;
  /**
   * Build a fresh, unattached popup element for `key`, opened from `trigger`.
   * Return `null` to abort the open (unknown key).
   */
  createPopup: (key: string, trigger: HTMLElement) => HTMLElement | null;
  /** Called after any popup opens, closes, or changes pin state. */
  onChange?: (open: ReadonlySet<string>, pinned: ReadonlySet<string>) => void;
}

interface PopupRecord {
  key: string;
  el: HTMLElement;
  trigger: HTMLElement;
  parentKey: string | null;
  pinned: boolean;
  leaveTimer: number | null;
}

function closestElement(node: EventTarget | null, selector: string) {
  return node instanceof Element ? node.closest<HTMLElement>(selector) : null;
}

export function createPopupStack(config: PopupStackConfig) {
  const { container } = config;
  const popups = new Map<string, PopupRecord>();
  const order: string[] = []; // open order, oldest first — Escape closes the last.

  const pinControlFrom = (node: EventTarget | null) =>
    config.pinControlFrom?.(node) ?? null;

  const notify = () => {
    config.onChange?.(
      new Set(popups.keys()),
      new Set([...popups.values()].filter((p) => p.pinned).map((p) => p.key)),
    );
  };

  const parentOf = (trigger: HTMLElement): string | null => {
    const host = closestElement(trigger, '[data-popup-key]');
    const key = host?.getAttribute('data-popup-key') ?? null;
    return key && popups.has(key) ? key : null;
  };

  function position(record: PopupRecord) {
    const edge = 12;
    const gap = 10;
    const { el, trigger } = record;
    const displayEquation = trigger.closest<HTMLElement>('.katex-display');
    const safeRegion = displayEquation ?? trigger;
    const regionRect = safeRegion.getBoundingClientRect();
    const anchorRect = trigger.getBoundingClientRect();

    const headerBottom =
      document.querySelector<HTMLElement>('.header')?.getBoundingClientRect()
        .bottom ?? 0;
    const verticalStart = Math.max(edge, headerBottom + edge);
    const verticalEnd = window.innerHeight - edge;
    const spaceAbove = regionRect.top - gap - verticalStart;
    const spaceBelow = verticalEnd - regionRect.bottom - gap;

    el.style.maxHeight = `${Math.max(spaceAbove, spaceBelow, 0)}px`;
    let rect = el.getBoundingClientRect();
    const placeBelow = spaceBelow >= rect.height || spaceBelow >= spaceAbove;
    el.style.maxHeight = `${Math.max(placeBelow ? spaceBelow : spaceAbove, 0)}px`;
    rect = el.getBoundingClientRect();

    let top = placeBelow
      ? regionRect.bottom + gap
      : regionRect.top - gap - rect.height;
    let left = anchorRect.left + anchorRect.width / 2 - rect.width / 2;

    const article = document.querySelector<HTMLElement>('.sl-markdown-content');
    const articleRect = article?.getBoundingClientRect();
    const horizontalStart = Math.max(edge, articleRect?.left ?? edge);
    const horizontalEnd = Math.min(
      window.innerWidth - edge,
      articleRect?.right ?? window.innerWidth - edge,
    );

    top = Math.max(verticalStart, Math.min(top, verticalEnd - rect.height));
    left =
      horizontalEnd - horizontalStart >= rect.width
        ? Math.max(horizontalStart, Math.min(left, horizontalEnd - rect.width))
        : Math.max(edge, Math.min(left, window.innerWidth - rect.width - edge));

    // Clear of every other open popup: cascade below whichever one this
    // still overlaps, then re-clamp to the viewport. A handful of popups
    // open at once is the realistic ceiling here, so a bounded scan is
    // plenty — this does not need to be a general bin-packer.
    const others = [...popups.values()]
      .filter((other) => other.key !== record.key)
      .map((other) => other.el.getBoundingClientRect());
    for (let attempt = 0; attempt < others.length + 4; attempt++) {
      const box = {
        top,
        left,
        right: left + rect.width,
        bottom: top + rect.height,
      };
      const hit = others.find(
        (o) =>
          box.left < o.right &&
          box.right > o.left &&
          box.top < o.bottom &&
          box.bottom > o.top,
      );
      if (!hit) break;
      top = hit.bottom + gap;
      if (top + rect.height > verticalEnd) {
        top = verticalStart;
        left += rect.width * 0.35 + gap;
      }
    }
    top = Math.max(verticalStart, Math.min(top, verticalEnd - rect.height));
    left = Math.max(
      edge,
      Math.min(left, window.innerWidth - rect.width - edge),
    );

    el.style.top = `${Math.round(top)}px`;
    el.style.left = `${Math.round(left)}px`;
  }

  function scheduleLeaveCheck(record: PopupRecord) {
    if (record.pinned) return;
    if (record.leaveTimer !== null) {
      window.cancelAnimationFrame(record.leaveTimer);
    }
    record.leaveTimer = window.requestAnimationFrame(() => {
      record.leaveTimer = null;
      if (!popups.has(record.key) || record.pinned) return;
      const staysOpen =
        record.trigger.matches(':hover') ||
        record.trigger === document.activeElement ||
        record.el.matches(':hover') ||
        record.el.contains(document.activeElement) ||
        // A hovered or pinned CHILD keeps its parent alive too — moving from
        // the trigger straight into a child popup (a real, legitimate path;
        // the child is positioned right next to it) must not close this one
        // out from under the reader mid-move.
        [...popups.values()].some((other) => other.parentKey === record.key);
      if (staysOpen) return;
      closePopup(record.key);
    });
  }

  function closePopup(key: string) {
    const record = popups.get(key);
    if (!record) return;
    // Children first — a card opened from inside this one has nothing left
    // to anchor to once it's gone.
    for (const other of [...popups.values()]) {
      if (other.parentKey === key) closePopup(other.key);
    }
    if (record.leaveTimer !== null) {
      window.cancelAnimationFrame(record.leaveTimer);
    }
    popups.delete(key);
    const at = order.indexOf(key);
    if (at !== -1) order.splice(at, 1);
    record.el.remove();
    if (popups.size === 0) releaseActiveSurface(config.groupId);
    notify();
  }

  function closeAll() {
    for (const key of [...popups.keys()]) closePopup(key);
  }

  function openPopup(key: string, trigger: HTMLElement, pin: boolean): void {
    const existing = popups.get(key);
    if (existing) {
      if (pin && !existing.pinned) {
        existing.pinned = true;
        notify();
      }
      return;
    }

    const el = config.createPopup(key, trigger);
    if (!el) return;

    if (popups.size === 0) claimActiveSurface(config.groupId, closeAll);

    el.dataset.popupKey = key;
    el.style.position = 'fixed';
    el.style.visibility = 'hidden';
    el.hidden = false;
    container.appendChild(el);

    const record: PopupRecord = {
      key,
      el,
      trigger,
      parentKey: parentOf(trigger),
      pinned: pin,
      leaveTimer: null,
    };
    popups.set(key, record);
    order.push(key);

    position(record);
    el.style.visibility = 'visible';

    el.addEventListener('pointerleave', () => scheduleLeaveCheck(record));
    el.addEventListener('focusout', () => scheduleLeaveCheck(record));

    notify();
  }

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    const trigger = config.triggerFrom(event.target);
    if (!trigger || trigger === config.triggerFrom(event.relatedTarget)) {
      return;
    }
    const key = config.keyFor(trigger);
    if (!key) return;
    openPopup(key, trigger, false);
  });

  document.addEventListener('pointerout', (event) => {
    if (event.pointerType === 'touch') return;
    const trigger = config.triggerFrom(event.target);
    if (!trigger || trigger === config.triggerFrom(event.relatedTarget)) {
      return;
    }
    const key = config.keyFor(trigger);
    const record = key ? popups.get(key) : undefined;
    if (record) scheduleLeaveCheck(record);
  });

  document.addEventListener('focusin', (event) => {
    const trigger = config.triggerFrom(event.target);
    const key = trigger ? config.keyFor(trigger) : null;
    if (trigger && key) openPopup(key, trigger, false);
  });

  document.addEventListener('focusout', (event) => {
    const trigger = config.triggerFrom(event.target);
    const key = trigger ? config.keyFor(trigger) : null;
    const record = key ? popups.get(key) : undefined;
    if (record) scheduleLeaveCheck(record);
  });

  document.addEventListener('click', (event) => {
    const control = pinControlFrom(event.target);
    if (control) {
      const ownKey = config.keyFor(control);
      if (ownKey) openPopup(ownKey, control, true);
      return;
    }

    const trigger = config.triggerFrom(event.target);
    if (trigger && !trigger.closest('a')) {
      const key = config.keyFor(trigger);
      if (key) {
        event.preventDefault();
        if (popups.get(key)?.pinned) {
          closePopup(key);
        } else {
          openPopup(key, trigger, true);
        }
        return;
      }
    }
    if (trigger) return; // a real link trigger: let it navigate.

    // Anywhere else inside an open popup collapses just that one — its body
    // is never a trigger, so a click there can only mean "I'm done with
    // this." (The corner "×" falls under this same rule.) A real link
    // inside it — "Open the full definition" — is excluded so it navigates.
    const host = closestElement(event.target, '[data-popup-key]');
    const hostKey = host?.getAttribute('data-popup-key');
    if (
      hostKey &&
      event.target instanceof Node &&
      !closestElement(event.target, 'a')
    ) {
      closePopup(hostKey);
    }
  });

  // Deliberately no "click outside closes everything": the reader explicitly
  // asked that clicking the equation itself — the unexplained parts included
  // — never collapses a card. Closing is always a targeted gesture: the "×",
  // a click on a card's own body, Escape, or (for a card that was only ever
  // hovered, never pinned) the pointer simply leaving.

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || order.length === 0) return;
    closePopup(order[order.length - 1]);
  });

  const repositionAll = () => {
    for (const record of popups.values()) position(record);
  };
  window.addEventListener('resize', repositionAll, { passive: true });
  window.addEventListener('scroll', repositionAll, {
    passive: true,
    capture: true,
  });

  return { closeAll };
}

export { closestElement };
