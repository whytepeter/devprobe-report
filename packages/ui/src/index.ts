/**
 * @deveprobe/ui
 * ─────────────
 * shadcn-vue component library themed to the Claude design system.
 * Warm palette · purple primary · rounded-lg · no ring-offset.
 *
 * All components live in src/components/ui/<name>/
 * Import via @deveprobe/ui or direct paths.
 */

// ── Form & interactive ────────────────────────────────────────────────────────
export { Button, buttonVariants }  from './components/ui/button/index.js';
export type { ButtonVariants }     from './components/ui/button/index.js';
export { default as Input }        from './components/ui/input/Input.vue';
export { default as Textarea }     from './components/ui/textarea/Textarea.vue';
export { Label }                   from './components/ui/label/index.js';

// Select (Radix-based custom select)
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemText,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/ui/select/index.js';

// ── Data display ──────────────────────────────────────────────────────────────
export { Badge, badgeVariants }    from './components/ui/badge/index.js';
export type { BadgeVariants }      from './components/ui/badge/index.js';
export {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from './components/ui/avatar/index.js';

// ── Navigation ────────────────────────────────────────────────────────────────
export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './components/ui/tabs/index.js';

// ── Overlays ──────────────────────────────────────────────────────────────────
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog/index.js';

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu/index.js';

export {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './components/ui/popover/index.js';

export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './components/ui/tooltip/index.js';

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './components/ui/command/index.js';

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Toaster,
  useToast,
} from './components/ui/toast/index.js';

// ── Layout ────────────────────────────────────────────────────────────────────
export { Separator }               from './components/ui/separator/index.js';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card/index.js';

// ── Iconography ───────────────────────────────────────────────────────────────
export { Icon } from './components/icon/index.js';

// ── Form (vee-validate + zod) ─────────────────────────────────────────────────
export {
  useForm,
  toTypedSchema,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './components/ui/form/index.js';

// ── Utilities ─────────────────────────────────────────────────────────────────
export { cn } from './lib/utils.js';
