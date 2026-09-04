/**
 * Interaction engine for the shared hover/pin panel (see `HoverPanel.astro`).
 *
 * One copy of the positioning, pin, Escape, outside-close, and
 * article-column-clamp logic that the notation layer and the citation layer
 * both need. Each layer supplies the domain-specific seams — how to find a
 * trigger, how to key it, how to fill the panel — and keeps its own markup.
 *
 * The panel is `position: fixed`. Placement clears the whole display equation
 * a marker sits inside (never just the glyph), decides the side against the
 * space left by the sticky site header, and keeps the box within the article
 * column so it never lands under a navigation rail.
 */

export interface HoverPanelState {
  activeKey: string | null;
  pinnedKey: string | null;
  visible: boolean;
}

export interface HoverPanelConfig {
  /** The `<aside data-hover-panel>` element. */
  panel: HTMLElement;
  /** Exclusivity group (see the `activeSurface` note below `HoverPanelState`). */
  groupId: string;
  /**
   * Element used only to locate the enclosing article column for the
   * horizontal clamp. Defaults to the panel itself.
   */
  root?: HTMLElement;
  /** Interactive element (marker, list row, control) for an event target. */
  triggerFrom: (node: EventTarget | null) => HTMLElement | null;
  /** Stable key identifying the content a trigger points at. */
  keyFor: (trigger: HTMLElement) => string | null;
  /**
   * Fill the panel for `trigger`/`key`. Return `false` to abort the open
   * (unknown key); the panel stays hidden.
   */
  render: (trigger: HTMLElement, key: string) => boolean | void;
  /** A pin toggle for an event target (a list button, an in-panel button). */
  pinControlFrom?: (node: EventTarget | null) => HTMLElement | null;
  /** Called after the panel is shown for `key`. */
  onShow?: (key: string, trigger: HTMLElement) => void;
  /** Called after the panel is hidden. */
  onClose?: () => void;
  /** Called after every open, close, or pin change. */
  onSync?: (state: HoverPanelState) => void;
}

function closestElement(node: EventTarget | null, selector: string) {
  return node instanceof Element ? node.closest<HTMLElement>(selector) : null;
}

/**
 * The notation layer and the citation layer each own their explanations —
 * the notation layer through its own popup stack (`./popup-stack.ts`), the
 * citation layer through this module's `createHoverPanel`. Neither knows the
 * other exists, so a pinned citation and an open notation popup — or the
 * reverse — can each be individually correct and still land on top of each
 * other, or on top of the equation the other one is explaining. Rather than
 * teach every positioning calculation about every other surface that might
 * exist, the two are mutually exclusive *groups*: opening the first popup in
 * one group closes whatever the other group had open. Within a group,
 * surfaces manage their own overlap (the citation panel is a singleton; the
 * notation stack positions its own popups against each other). A pin is not
 * exempt — the reader's attention already moved to the other group.
 */
let activeSurface: {
  readonly groupId: string;
  readonly close: () => void;
} | null = null;

export function claimActiveSurface(groupId: string, close: () => void): void {
  if (activeSurface && activeSurface.groupId !== groupId) {
    activeSurface.close();
  }
  activeSurface = { groupId, close };
}

export function releaseActiveSurface(groupId: string): void {
  if (activeSurface?.groupId === groupId) activeSurface = null;
}

export function createHoverPanel(config: HoverPanelConfig) {
  const { panel } = config;
  if (panel.dataset.hoverPanelReady === 'true') return;
  panel.dataset.hoverPanelReady = 'true';

  const anchorRoot = config.root ?? panel;

  let activeKey: string | null = null;
  let activeAnchor: HTMLElement | null = null;
  let pinned: { key: string; anchor: HTMLElement } | null = null;

  const sync = () => {
    config.onSync?.({
      activeKey,
      pinnedKey: pinned?.key ?? null,
      visible: panel.hidden === false,
    });
  };

  const pinControlFrom = (node: EventTarget | null) =>
    config.pinControlFrom?.(node) ?? null;

  const interactiveFrom = (node: EventTarget | null) =>
    pinControlFrom(node) ?? config.triggerFrom(node);

  const position = () => {
    if (panel.hidden || !activeAnchor) return;

    const edge = 12;
    const gap = 10;
    const displayEquation = activeAnchor.closest<HTMLElement>('.katex-display');
    const safeRegion = displayEquation ?? activeAnchor;
    const regionRect = safeRegion.getBoundingClientRect();
    const anchorRect = activeAnchor.getBoundingClientRect();

    // The usable band is bounded by the sticky header, not the raw viewport
    // edge. Decide the side against that real space so a clamp against the
    // header can never push the panel back down over the equation.
    const headerBottom =
      document.querySelector<HTMLElement>('.header')?.getBoundingClientRect()
        .bottom ?? 0;
    const verticalStart = Math.max(edge, headerBottom + edge);
    const verticalEnd = window.innerHeight - edge;
    const spaceAbove = regionRect.top - gap - verticalStart;
    const spaceBelow = verticalEnd - regionRect.bottom - gap;

    // Measure the panel in the roomier band, then keep it on whichever side
    // actually clears the safe region; shrink only when neither side fits.
    panel.style.maxHeight = `${Math.max(spaceAbove, spaceBelow, 0)}px`;
    let panelRect = panel.getBoundingClientRect();
    const placeBelow =
      spaceBelow >= panelRect.height || spaceBelow >= spaceAbove;
    panel.style.maxHeight = `${Math.max(placeBelow ? spaceBelow : spaceAbove, 0)}px`;
    panelRect = panel.getBoundingClientRect();

    let top = placeBelow
      ? regionRect.bottom + gap
      : regionRect.top - gap - panelRect.height;
    let left = anchorRect.left + anchorRect.width / 2 - panelRect.width / 2;

    const article =
      anchorRoot
        .closest<HTMLElement>('.main-pane')
        ?.querySelector<HTMLElement>('.sl-markdown-content') ??
      document.querySelector<HTMLElement>('.sl-markdown-content');
    const articleRect = article?.getBoundingClientRect();
    const horizontalStart = Math.max(edge, articleRect?.left ?? edge);
    const horizontalEnd = Math.min(
      window.innerWidth - edge,
      articleRect?.right ?? window.innerWidth - edge,
    );

    top = Math.max(
      verticalStart,
      Math.min(top, verticalEnd - panelRect.height),
    );
    left =
      horizontalEnd - horizontalStart >= panelRect.width
        ? Math.max(
            horizontalStart,
            Math.min(left, horizontalEnd - panelRect.width),
          )
        : Math.max(
            edge,
            Math.min(left, window.innerWidth - panelRect.width - edge),
          );

    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${Math.round(left)}px`;
  };

  const show = (anchor: HTMLElement) => {
    const key = config.keyFor(anchor);
    if (!key) return;
    if (config.render(anchor, key) === false) return;

    claimActiveSurface(config.groupId, forceClose);

    activeKey = key;
    activeAnchor = anchor;
    config.onShow?.(key, anchor);

    panel.style.visibility = 'hidden';
    panel.hidden = false;
    position();
    panel.style.visibility = 'visible';
    sync();
  };

  const close = () => {
    activeKey = null;
    activeAnchor = null;
    panel.hidden = true;
    config.onClose?.();
    releaseActiveSurface(config.groupId);
    sync();
  };

  // A plain `close()` deliberately leaves `pinned` set — a stray pointerout or
  // focusout elsewhere on the page must not kill a pin the reader placed on
  // purpose, and `restorePinnedOrClose` below relies on `pinned` surviving a
  // transient close to bring the panel back. Being displaced by a DIFFERENT
  // panel taking over (`claimActivePanel`) is not transient, though: without
  // clearing the pin here, the very next stray blur anywhere on the page finds
  // `pinned` still truthy and restores this panel — undoing the takeover a
  // frame later and fighting the other panel for the screen.
  const forceClose = () => {
    pinned = null;
    close();
  };

  const restorePinnedOrClose = () => {
    window.requestAnimationFrame(() => {
      const focused = config.triggerFrom(document.activeElement);
      if (focused && config.keyFor(focused) === activeKey) return;
      if (pinned) {
        show(pinned.anchor);
        return;
      }
      if (
        activeAnchor?.matches(':hover') ||
        panel.matches(':hover') ||
        panel.contains(document.activeElement)
      ) {
        return;
      }
      close();
    });
  };

  const togglePin = (key: string, anchor: HTMLElement) => {
    if (pinned?.key === key && pinned.anchor === anchor) {
      pinned = null;
      close();
      return;
    }
    pinned = { key, anchor };
    show(anchor);
  };

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch' || pinned) return;
    const anchor = config.triggerFrom(event.target);
    const key = anchor ? config.keyFor(anchor) : null;
    if (anchor && key && anchor !== config.triggerFrom(event.relatedTarget)) {
      show(anchor);
    }
  });

  document.addEventListener('pointerout', (event) => {
    if (event.pointerType === 'touch') return;
    const anchor = config.triggerFrom(event.target);
    if (!anchor || anchor === config.triggerFrom(event.relatedTarget)) return;
    if (
      event.relatedTarget instanceof Node &&
      panel.contains(event.relatedTarget)
    ) {
      return;
    }
    restorePinnedOrClose();
  });

  document.addEventListener('focusin', (event) => {
    const anchor = config.triggerFrom(event.target);
    const key = anchor ? config.keyFor(anchor) : null;
    if (anchor && key) show(anchor);
  });
  document.addEventListener('focusout', restorePinnedOrClose);

  document.addEventListener('click', (event) => {
    const control = pinControlFrom(event.target);
    if (control) {
      const ownKey = config.keyFor(control);
      if (ownKey) {
        togglePin(ownKey, control);
      } else if (activeKey && activeAnchor) {
        togglePin(activeKey, activeAnchor);
      }
      return;
    }

    const trigger = config.triggerFrom(event.target);
    if (trigger && !trigger.closest('a')) {
      const key = config.keyFor(trigger);
      if (key) {
        event.preventDefault();
        togglePin(key, trigger);
        return;
      }
    }
    if (trigger) return; // a real link trigger: let it navigate.

    // Anywhere else inside the panel collapses it, same as the corner "×" —
    // its own body is never a trigger, so a click there can only mean "I'm
    // done with this." A real link (e.g. "Open source link") is excluded so
    // it still navigates instead of being swallowed.
    if (
      !panel.hidden &&
      event.target instanceof Node &&
      panel.contains(event.target) &&
      !closestElement(event.target, 'a')
    ) {
      pinned = null;
      close();
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (!pinned) return;
    if (
      interactiveFrom(event.target) ||
      (event.target instanceof Node && panel.contains(event.target))
    ) {
      return;
    }
    pinned = null;
    close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || (!activeKey && !pinned)) return;
    pinned = null;
    close();
  });

  panel.addEventListener('pointerleave', restorePinnedOrClose);
  window.addEventListener('resize', position, { passive: true });
  window.addEventListener('scroll', position, {
    passive: true,
    capture: true,
  });

  sync();
}

export { closestElement };
