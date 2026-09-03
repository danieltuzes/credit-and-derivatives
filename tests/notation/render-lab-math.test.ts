import { describe, expect, it } from 'vitest';
import { renderLabMath } from '@danieltuzes/legend/reference/render-lab-math';

const scope = [
  { key: 'discount-factor', notation: 'D(0,t)' },
  { key: 'payment-time', notation: 't_k' },
  { key: 'present-value', notation: 'PV_0' },
  { key: 'discounting-lab-rate', notation: 'y' },
  { key: 'discounting-lab-cash-flow', notation: 'C' },
];

describe('renderLabMath', () => {
  it('binds real symbols to notation keys and keeps slots as inert holes', () => {
    const rendered = renderLabMath(
      String.raw`D(0,t) = (1 + y)^{-t} = (1 + \slot{rate}{0.0500})^{-\slot{years}{2}} = \slot{factor}{0.9}`,
      scope,
    );

    expect(rendered.html).toContain('data-notation-key="discount-factor"');
    expect(rendered.html).toContain('data-notation-key="discounting-lab-rate"');
    expect(rendered.html).toContain('data-notation-key="payment-time"');
    expect(rendered.html).toContain('data-lab-slot="rate"');
    expect(rendered.html).toContain('data-lab-slot="years"');
    expect(rendered.html).toContain('data-lab-slot="factor"');
    // default value ships in the markup for a correct first paint
    expect(rendered.html).toContain('0.0500');
    expect(rendered.slots).toEqual(['rate', 'years', 'factor']);
    expect(rendered.keys).toEqual(
      expect.arrayContaining([
        'discount-factor',
        'discounting-lab-rate',
        'payment-time',
      ]),
    );
  });

  it('binds PV_0 and C', () => {
    const rendered = renderLabMath(
      String.raw`PV_0 = C \cdot D(0,t) = \slot{p}{1} \times \slot{f}{0.9} = \slot{v}{0.9}`,
      scope,
    );
    expect(rendered.html).toContain('data-notation-key="present-value"');
    expect(rendered.html).toContain(
      'data-notation-key="discounting-lab-cash-flow"',
    );
  });

  it('throws when a symbol is not a notation entry in scope', () => {
    expect(() =>
      renderLabMath(String.raw`D(0,t) = z \cdot \slot{a}{1}`, scope),
    ).toThrow(/undefined notation .*"z"/);
  });

  it('throws when a referenced key is absent from the provided scope', () => {
    expect(() =>
      renderLabMath(String.raw`PV_0 = \slot{a}{1}`, [
        { key: 'discount-factor', notation: 'D(0,t)' },
      ]),
    ).toThrow(/undefined notation/);
  });
});
