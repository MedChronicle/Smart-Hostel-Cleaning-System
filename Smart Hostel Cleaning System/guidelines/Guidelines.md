# UI Components Guidelines

Guidelines for the upgraded shadcn/ui-style components in this project:
`collapsible`, `command`, `form`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`.

All components are backwards compatible with the stock shadcn versions. Every original export still exists, and new behavior is opt-in through new props or new exports.

---

## 1. Setup

### Files and internal dependencies

```
components/ui/
├── utils.ts           # exports `cn` (clsx + tailwind-merge)
├── label.tsx          # used by form.tsx
├── button.tsx         # used by dialog.tsx (ConfirmDialog)
├── dialog.tsx         # used by command.tsx (CommandDialog)
├── collapsible.tsx
├── command.tsx
├── form.tsx
├── context-menu.tsx
├── drawer.tsx
└── dropdown-menu.tsx
```

Some files import `cn` from `"@/lib/utils"` and others from `"./utils"`. Pick one convention for your project and update the imports to match.

### NPM packages

```bash
npm i @radix-ui/react-collapsible @radix-ui/react-context-menu \
      @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
      @radix-ui/react-label @radix-ui/react-slot \
      cmdk vaul react-hook-form lucide-react
```

### Required Tailwind keyframes (Collapsible)

`CollapsibleContent` uses `animate-collapsible-down` and `animate-collapsible-up`. Add the keyframes once to your global CSS (Tailwind v4):

```css
@theme inline {
  --animate-collapsible-down: collapsible-down 200ms ease-out;
  --animate-collapsible-up: collapsible-up 200ms ease-out;

  @keyframes collapsible-down {
    from { height: 0; opacity: 0; }
    to   { height: var(--radix-collapsible-content-height); opacity: 1; }
  }
  @keyframes collapsible-up {
    from { height: var(--radix-collapsible-content-height); opacity: 1; }
    to   { height: 0; opacity: 0; }
  }
}
```

Without these, the content still opens and closes but does not animate.

---

## 2. General conventions

- **`"use client"`** is required at the top of every file because they use hooks, context or Radix primitives.
- **`data-slot` attributes** (`data-slot="dialog-content"` and so on) are the styling hooks. Target them in CSS instead of relying on class names.
- **Always merge classes with `cn()`**, and put `className` last so consumers can override defaults.
- **Prefer props over class overrides** for things that now have props (`size`, `showCloseButton`, `blurOverlay` and others).
- **Reduced motion:** animated parts include `motion-reduce:animate-none`. Keep this when adding new animations.
- **Keep primitives dumb.** Business logic (data fetching, routing) belongs in the consuming component, not in `components/ui`.

---

## 3. Component reference

### Collapsible

| Export | Purpose |
|---|---|
| `Collapsible` | Root. Controlled (`open` and `onOpenChange`) or uncontrolled (`defaultOpen`). |
| `CollapsibleTrigger` | Supports `showChevron`, `chevronPosition="start" \| "end"` and `asChild`. |
| `CollapsibleContent` | Animated. `className` applies to an inner wrapper, so padding does not break the height animation. |
| `CollapsibleSection` | Ready-made bordered card with `title`, `description` and `contentClassName`. |
| `useCollapsible()` | Reads `{ open, setOpen, toggle }` from inside a `<Collapsible>`. |

**Do**
- Use `CollapsibleSection` for simple "titled, expandable block" UI.
- Put padding on `CollapsibleContent`'s `className`, not on an outer element.

**Don't**
- Call `useCollapsible()` outside a `<Collapsible>`. It throws.
- Use `showChevron` together with `asChild`. The chevron is only rendered for the default trigger.

```tsx
<CollapsibleSection title="Advanced settings" description="Optional" defaultOpen>
  Content
</CollapsibleSection>
```

---

### Command

| Export | Purpose |
|---|---|
| `Command`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandSeparator`, `CommandEmpty`, `CommandShortcut` | Same as stock cmdk wrappers. |
| `CommandDialog` | Palette in a dialog. Accepts `commandProps` (forwarded to `Command`) and `className`. |
| `CommandInput` | Adds `loading` (spinner) and `clearable` (default `true`). |
| `CommandLoading` | Loading state for async results. |
| `CommandItem` | Adds an `icon` prop. |
| `CommandKbd`, `CommandFooter` | Keyboard hints. `CommandFooter` has default hints (navigate, select, close). |
| `useCommandShortcut()` | Returns `[open, setOpen]` and toggles on Cmd/Ctrl+K. |

**Do**
- For async search, set `commandProps={{ shouldFilter: false }}` and drive `loading` from your fetch state.
- Mount `useCommandShortcut()` once, near the root of your layout.

**Don't**
- Mount multiple palettes with the same shortcut.
- Forget `CommandEmpty`. Without it, empty searches show a blank list.

```tsx
const [open, setOpen] = useCommandShortcut();

<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Search..." loading={isFetching} />
  <CommandList>
    <CommandEmpty>No results.</CommandEmpty>
    <CommandGroup heading="Actions">
      <CommandItem icon={<PlusIcon />}>New file</CommandItem>
    </CommandGroup>
  </CommandList>
  <CommandFooter />
</CommandDialog>
```

---

### Form

| Export | Purpose |
|---|---|
| `Form` | Alias for react-hook-form's `FormProvider`. |
| `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` | Same structure as stock shadcn. |
| `FormLabel` | Adds `required` (red asterisk, hidden from screen readers). |
| `FormFieldItem` | One-component field: label, control, description and message. |
| `FormErrorSummary` | Lists all errors, including nested ones, and focuses the first invalid field after a failed submit. |
| `useFormField()` | Returns ids, name and field state. Throws if used outside `<FormField>` or `<FormItem>`. |

**Do**
- Wrap `FormControl` around exactly one child (it uses `Slot`).
- Place `FormErrorSummary` near the top of long forms.
- Use `FormFieldItem` for plain inputs and the lower-level parts for custom layouts.

**Don't**
- Render `FormLabel`, `FormControl` or `FormMessage` outside a `FormItem` inside a `FormField`.
- Hand-write `id`, `aria-describedby` or `aria-invalid` on controls. `FormControl` sets them.

**Accessibility notes:** `FormMessage` uses `role="alert"` and `aria-live="polite"` when there is an error, and `FormControl` sets `aria-errormessage`.

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormErrorSummary />
    <FormFieldItem
      name="email"
      label="Email"
      description="We'll never share it."
      required
      render={(field) => <Input type="email" {...field} />}
    />
  </form>
</Form>
```

---

### Context menu and Dropdown menu

Both share the same API shape. Use `ContextMenu*` for right-click (long-press on touch) and `DropdownMenu*` for menus opened by a button.

| Export | Purpose |
|---|---|
| `*Item` | Adds `icon`, `shortcut`, `loading`, `variant="destructive"`. The dropdown item also has `description`. |
| `*CheckboxItem`, `*RadioItem` | Both accept `shortcut`. |
| `*SubTrigger` | Accepts `icon`. |
| `*Content`, `*SubContent` | `collisionPadding` defaults to 8px. |
| `*Empty` | Placeholder for empty menus. |
| `*Items` | Builds a menu from an array of entries. |
| `ContextMenuEntry`, `DropdownMenuEntry` | Exported entry types. |

Entry types for `*Items`: `item` (default), `checkbox`, `radio-group`, `sub`, `label`, `separator`.

**Do**
- Use `variant="destructive"` for delete, remove and log out, and place those items last, after a separator.
- Use `loading` for actions that start async work.
- Use `*Items` for data-driven menus and the individual parts for static or highly customized menus.

**Don't**
- Put essential actions *only* in a context menu. Touch and keyboard users may miss them, so mirror them in a visible control.
- Nest submenus more than two levels deep.

```tsx
<DropdownMenuItems
  items={[
    { type: "label", label: "My Account" },
    { label: "Profile", icon: <UserIcon />, shortcut: "⇧⌘P" },
    { type: "checkbox", label: "Notifications", checked, onCheckedChange: setChecked },
    { type: "separator" },
    { label: "Log out", variant: "destructive", loading: isLoggingOut, onSelect: logout },
  ]}
/>
```

---

### Dialog

| Export | Purpose |
|---|---|
| `DialogContent` | New props: `size` (`sm` / `md` / `lg` / `xl` / `full`), `showCloseButton`, `dismissible`, `blurOverlay`. |
| `DialogOverlay` | New `blur` prop. |
| `DialogBody` | Scrollable middle section. |
| `ConfirmDialog` | Async-aware confirmation dialog (needs `./button`). |

**Do**
- Always include a `DialogTitle`. Include a `DialogDescription` too, or Radix will warn about missing accessible description.
- Use `dismissible={false}` for unsaved changes or in-flight requests.
- Use `size="lg"` or larger with `DialogBody` for long content, and give `DialogBody` a `max-h-*`.
- Use `ConfirmDialog` for destructive confirmations instead of `window.confirm`.

**Don't**
- Open a dialog from inside another dialog. Use a single dialog with steps instead.
- Rely on the backdrop click to save data.

**`ConfirmDialog` behavior:** it blocks closing while `onConfirm` is pending. If `onConfirm` throws, the dialog stays open and shows the error message. It can be controlled (`open` and `onOpenChange`) or uncontrolled.

```tsx
<ConfirmDialog
  trigger={<Button variant="destructive">Delete</Button>}
  title="Delete this project?"
  description="This can't be undone."
  confirmLabel="Delete"
  variant="destructive"
  onConfirm={async () => { await deleteProject(id); }}
/>
```

---

### Drawer

| Export | Purpose |
|---|---|
| `DrawerContent` | New props: `size` (`sm` / `md` / `lg` / `xl`, for left and right drawers), `showHandle`, `showCloseButton`, `blurOverlay`. |
| `DrawerBody` | Scrollable middle section. |
| `useMediaQuery(query)` | SSR-safe media query hook. Returns `false` on first render. |

**Do**
- Use `direction="bottom"` on mobile and `direction="right"` on desktop, switched with `useMediaQuery`.
- Use `DrawerBody` between header and footer for scrollable content.
- Keep the safe-area padding on bottom drawers, which handles the iPhone home indicator.

**Don't**
- Pass `size` to top or bottom drawers. It only affects left and right.
- Read `useMediaQuery` during render for layout-critical output without handling the initial `false` (it can flash on first paint).

```tsx
const isDesktop = useMediaQuery("(min-width: 768px)");

<Drawer direction={isDesktop ? "right" : "bottom"}>
  <DrawerTrigger asChild><Button>Filters</Button></DrawerTrigger>
  <DrawerContent size="lg" showCloseButton>
    <DrawerHeader>
      <DrawerTitle>Filters</DrawerTitle>
      <DrawerDescription>Narrow your results.</DrawerDescription>
    </DrawerHeader>
    <DrawerBody>{filters}</DrawerBody>
    <DrawerFooter><Button>Apply</Button></DrawerFooter>
  </DrawerContent>
</Drawer>
```

---

## 4. Choosing the right overlay

| Need | Use |
|---|---|
| Quick confirmation | `ConfirmDialog` |
| Focused task or form on desktop | `Dialog` |
| Mobile-friendly panel, filters, side details | `Drawer` |
| List of actions from a button | `DropdownMenu` |
| Secondary actions on right-click or long-press | `ContextMenu` |
| Global search and navigation | `CommandDialog` |
| Show or hide inline content | `Collapsible` |

---

## 5. Accessibility checklist

- [ ] Every dialog and drawer has a title (and a description where it helps).
- [ ] Icon-only triggers have an accessible name (`aria-label` or an `sr-only` span).
- [ ] Form errors are shown through `FormMessage` (announced automatically).
- [ ] Destructive actions are visually distinct and require confirmation.
- [ ] Everything works with the keyboard alone (Tab, Enter, Space, Esc, arrow keys).
- [ ] Animations respect `prefers-reduced-motion`.
- [ ] Color is not the only indicator of state (errors, selection).

---

## 6. Testing checklist

- [ ] Open and close with mouse, keyboard and touch.
- [ ] Controlled and uncontrolled modes both work (`open` / `defaultOpen`).
- [ ] Menus and drawers near viewport edges reposition correctly.
- [ ] Long content scrolls inside `DialogBody` and `DrawerBody`, not the page.
- [ ] `ConfirmDialog` error path: the dialog stays open and shows the message.
- [ ] Form: failed submit shows the error summary and focuses the first invalid field.
- [ ] Dark mode renders correctly (use theme tokens such as `bg-popover`, never hard-coded colors).
- [ ] No hydration warnings (`useMediaQuery` starts as `false` on both server and client).

---

## 7. Migrating from stock shadcn

1. Replace the component files with these versions. Imports and existing usage keep working.
2. Add the Collapsible keyframes to your global CSS.
3. Make sure `button.tsx` exists if you use `ConfirmDialog`.
4. Adopt new props gradually. Nothing changes visually until you opt in.

Behavior changes worth knowing about:
- `CommandDialog` now places its title and description *inside* `DialogContent` (better screen reader association).
- `DialogContent` now caps its height to the viewport and scrolls.
- `useFormField` now validates its contexts before using them, so misuse throws a clear error instead of failing silently.
- `DropdownMenuSubTrigger` gains disabled styling and icon sizing that matched regular items.
