/**
 * Shared timer digit readout chrome so Countdown and Countup strips match below the `sm` breakpoint.
 * Fixed width keeps stacked cards aligned; inner row is centered as one unit.
 */
export const TIMER_READOUT_SHELL_CLASSES =
  'relative flex h-12 shrink-0 items-center rounded-sm border border-button-secondary-border bg-button-secondary px-1 font-data text-3xl leading-none font-bold whitespace-nowrap text-button-secondary-text tabular-nums max-sm:w-[calc(0.5rem+5.25ch)] max-sm:justify-center sm:h-14 sm:w-fit sm:justify-start sm:px-2.5 sm:text-5xl'

/** Centers the MM:SS cluster inside the fixed-width shell; `sm:contents` removes the wrapper from layout ≥sm. */
export const TIMER_READOUT_MAX_SM_CENTER_WRAPPER_CLASSES =
  'max-sm:flex max-sm:w-full max-sm:justify-center sm:contents'

/** Start / Pause / Resume / Stop — below `sm`, tighter than default timer `lg` AppButton. */
export const TIMER_PRIMARY_ACTION_MAX_SM_CLASSES =
  'max-sm:h-8 max-sm:min-h-8 max-sm:px-2 max-sm:py-1 max-sm:text-xs max-sm:font-bold max-sm:leading-none max-sm:rounded-md'

/** +5 / +10 — height matches readout column; minimal padding and type. */
export const TIMER_EXTENSION_BUTTON_MAX_SM_CLASSES =
  'max-sm:h-[22px] max-sm:min-h-[22px] max-sm:min-w-0 max-sm:px-0.5 max-sm:py-0 max-sm:text-[9px] max-sm:font-bold max-sm:leading-none max-sm:rounded-md'
