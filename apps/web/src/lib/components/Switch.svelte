<script lang="ts">
  let {
    checked = $bindable(false),
    label,
    disabled = false,
    onchange
  }: { checked?: boolean; label: string; disabled?: boolean; onchange?: (value: boolean) => void } = $props();
</script>

<button
  type="button"
  class="switch"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  {disabled}
  onclick={() => {
    checked = !checked;
    onchange?.(checked);
  }}
></button>
