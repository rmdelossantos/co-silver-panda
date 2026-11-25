// Stable callback ref: moves focus to an element when it appears (e.g. a form-level error alert, which
// remounts on each failed attempt because a new mutation clears the previous error).
export const focusOnMount = (el: HTMLElement | null) => el?.focus();
