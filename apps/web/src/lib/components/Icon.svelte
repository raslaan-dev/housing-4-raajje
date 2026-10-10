<script lang="ts" module>
  import {
    ArrowLeft,
    CalendarCheck,
    ChartColumn,
    Check,
    ClipboardCheck,
    Eye,
    FileText,
    HandCoins,
    Hammer,
    History,
    House,
    LayoutDashboard,
    MessageCircle,
    MessageSquare,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    Signature,
    Sparkles,
    User,
    Users
  } from '@jis3r/icons';

  // Animated Lucide icons from movingicons.dev (@jis3r/icons).
  const ICONS = {
    'arrow-left': ArrowLeft,
    check: Check,
    'menu-open': PanelLeftOpen,
    'menu-close': PanelLeftClose,
    search: Search,
    lease: FileText,
    messages: MessageSquare,
    maintenance: Hammer,
    profile: User,
    dashboard: LayoutDashboard,
    properties: House,
    availability: CalendarCheck,
    earnings: HandCoins,
    queue: ClipboardCheck,
    viewings: Eye,
    matches: Sparkles,
    signature: Signature,
    inquiries: MessageCircle,
    reports: ChartColumn,
    accounts: Users,
    audit: History
  };

  export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
  let { name, size = 16, animate = false, strokeWidth = 1.75 }: { name: IconName; size?: number; animate?: boolean; strokeWidth?: number } =
    $props();

  const Component = $derived(ICONS[name]);
</script>

<span class="icon" aria-hidden="true">
  <Component {size} {animate} {strokeWidth} />
</span>

<style>
  .icon {
    display: inline-flex;
    flex: none;
    line-height: 0;
  }

  .icon :global(div) {
    display: block;
  }
</style>
