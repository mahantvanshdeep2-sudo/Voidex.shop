# The VOIDEX motion layer

Three files, one render hook. Everything lives on the dev theme
`167583219962` (`VOIDEX Motion — DEV (do not publish)`).

| File | What it does |
|---|---|
| `theme/assets/voidex-motion.css` | Every rule. Reveals, page-transition choreography, micro-interactions, reduced-motion guards. |
| `theme/assets/voidex-motion.js` | The reveal engine. Adds classes and one custom property; owns no layout. |
| `theme/snippets/voidex-motion.liquid` | Inlines the CSS, arms the failsafe, loads the module. |
| `theme/layout/theme.liquid` | One added line: `{%- render 'voidex-motion' -%}`, last in `<head>`. |

## What you actually see

**Page-to-page navigation.** Savor already opts into cross-document (MPA) view transitions and
tags each navigation with a type in `assets/view-transitions.js`. What was missing was the
choreography and — more importantly — the two settings the whole pipeline is gated on
(`page_transition_enabled`, `transition_to_main_product`), neither of which was present in
`settings_data.json`. Both are now explicitly `true`.

The header and footer are given their own `view-transition-name`, which lifts them out of the
root snapshot so they hold still while the page content swaps instead of cross-fading with it.
That single change is the biggest smoothness win in the whole layer: navigation stops feeling
like a page load and starts feeling like the content moved.

**Scrolling.** Each section fades in as it approaches the viewport, and its top-level children
rise 18px with a 70ms stagger between them, on an expo-out curve
(`cubic-bezier(0.16, 1, 0.3, 1)`). The long tail of that curve is what reads as "smooth"
rather than "fast".

**Touch.** Buttons take a 2.5% press-scale on pointer devices only, so a tap on mobile doesn't
fight the browser's own active state. Card image zoom (Savor's `subtle-zoom`) is re-eased and
lengthened so it glides instead of snapping. Lazy images fade in once a decode is confirmed
rather than popping in. The header picks up a soft shadow once the page leaves the top.

## Four rules the code holds to

1. **Only `opacity` and `transform` animate.** Both are compositor-driven, so no reveal
   triggers layout or paint on the main thread.
2. **No `transform` on any section-level element.** A transform creates a containing block,
   which silently breaks `position: sticky` and `position: fixed` descendants. The product
   page's sticky add-to-cart bar and the collection filter rail both depend on those. Sections
   fade; only their inner children translate. A test asserts this, and it has already caught
   one violation.
3. **Nothing is hidden unless JS has confirmed it can un-hide it.** Every hiding rule is gated
   on `html[data-vx-motion='on']`. An inline boot script sets that attribute and arms a 2.5s
   timer to remove it; the engine cancels the timer when it boots. So if the module 404s,
   throws, or is blocked by an extension, the attribute disappears and the page renders as
   plain, fully visible Savor. The engine also clears it on every bail-out path.
4. **The first section is never hidden waiting on JS.** It carries the LCP, so it animates via
   a pure-CSS keyframe that cannot fail to complete.

## Who gets no animation at all

- anyone with `prefers-reduced-motion: reduce` (checked twice: the inline boot script won't
  even set the attribute, and the engine refuses to boot)
- devices reporting ≤2 CPU cores or ≤2GB memory — they drop frames on staggered reveals, so
  they get none. Matches `isLowPowerDevice()` in Savor's own `assets/utilities.js`.
- Android WebView and the Facebook / Instagram / TikTok in-app browsers, which mishandle
  compositor-driven reveals during navigation. Matches the detector in Savor's
  `assets/view-transitions.js`; **keep the two in sync.**

## Finding the elements to stagger

Horizon wraps section content in a variable number of layout divs, so the children worth
staggering are never at a fixed depth. `findStaggerItems()` walks down from the section
through any chain of single-child wrappers to the first element that actually branches, and
takes that element's children (capped at 10). No theme class name is hard-coded, so this keeps
working when Shopify changes Horizon's internals.

Sections containing a `slideshow-component` or `scroll-container` are skipped for staggering
and just fade whole — staggering inside a carousel fights its own measurement.

## Sections that appear after load

`section-renderer.js` swaps whole sections in for filtering, pagination and quick-add, and the
theme editor re-renders on every setting change. Both arrive as subtree mutations on
`#MainContent`, so a `MutationObserver` re-scans and registers anything new. Without that, a
freshly filtered section would stay hidden forever. There's a test for exactly this.

## Running the tests

The suite drives real Chromium against a harness that reproduces Horizon's DOM shape and loads
the actual asset files — so it tests the shipped code, not a copy.

```sh
node tests/harness/build.js                       # regenerate the harness from theme/assets/*
(cd tests/harness && npx http-server . -p 8097 -s &)
node tests/motion.test.js                         # 27 assertions
```

The harness must be served from its own directory — the test expects it at
`http://127.0.0.1:8097/`. If `playwright` is installed globally rather than in the project,
prefix with `NODE_PATH=$(npm root -g)`. Screenshots land in `tests/shots/`.

## Tuning it

Everything is a custom property on `:root` in the CSS:

| Property | Default | Effect |
|---|---|---|
| `--vx-dur-base` | `420ms` | Fade duration |
| `--vx-dur-slow` | `720ms` | Rise duration, first-section load-in |
| `--vx-rise` | `18px` | How far children travel |
| `--vx-stagger` | `70ms` | Delay between siblings |
| `--vx-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | The main curve |

Want it calmer? Drop `--vx-rise` to `10px` and `--vx-stagger` to `40ms`. Want it more
theatrical? `--vx-rise: 28px`, `--vx-stagger: 100ms`, `--vx-dur-slow: 900ms`.

## Turning it off

Remove the `{%- render 'voidex-motion' -%}` line from `layout/theme.liquid`. That's the whole
rollback — nothing else in the theme references these files, and no theme-owned CSS or JS was
modified.
