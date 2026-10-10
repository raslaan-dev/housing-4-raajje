<script lang="ts">
  import { statusLabel, statusTone } from '$lib/format';

  let { status, label, tone }: { status: string; label?: string; tone?: string } = $props();
</script>

<span class="pill {tone ?? statusTone(status)}">{label ?? statusLabel(status)}</span>
