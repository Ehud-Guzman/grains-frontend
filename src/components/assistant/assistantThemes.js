// The help assistant appears in two places that look different: inside the admin panel and
// inside the storefront / driver Help Center. Same behaviour, different class names. The
// storefront's `earth` scale sits one step lighter than the admin's grey (earth-100 is
// admin-50 — see tailwind.config.js), so the two are not interchangeable.

export const ASSISTANT_THEMES = {
  admin: {
    font: 'font-admin',
    ink: 'text-admin-900',
    strong: 'text-admin-800',
    body: 'text-admin-700',
    soft: 'text-admin-600',
    muted: 'text-admin-500',
    faint: 'text-admin-400',
    line: 'border-admin-100',
    lineStrong: 'border-admin-200',
    surface: 'bg-admin-50',
    surfaceHover: 'hover:bg-admin-50',
    inputPlaceholder: 'placeholder:text-admin-400',
  },
  storefront: {
    font: 'font-body',
    ink: 'text-earth-900',
    strong: 'text-earth-800',
    body: 'text-earth-700',
    soft: 'text-earth-600',
    muted: 'text-earth-500',
    faint: 'text-earth-400',
    line: 'border-earth-200',
    lineStrong: 'border-earth-300',
    surface: 'bg-earth-100',
    surfaceHover: 'hover:bg-earth-100',
    inputPlaceholder: 'placeholder:text-earth-400',
  },
}
