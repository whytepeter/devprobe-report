<!--
  IssueCardSkeleton
  ─────────────────
  Placeholder rendered while the issues list query is pending. Matches the
  IssueCard's outer dimensions so the layout doesn't reflow when real cards
  arrive.

  Pulse animation only on the bars/swatches — the card border stays steady
  so the page reads as "loading" without flicker.
-->
<template>
  <div
    aria-hidden="true"
    class="rounded-xl border border-border bg-card overflow-hidden"
  >
    <!-- Media area -->
    <div class="relative aspect-[16/10] bg-muted/40 border-b border-border overflow-hidden">
      <div class="absolute inset-0 p-6 flex flex-col gap-2.5 justify-center animate-pulse">
        <div class="h-2 w-1/2 rounded bg-muted-foreground/15" />
        <div class="h-3 w-1/3 rounded bg-primary/20" />
        <div class="h-2 w-2/3 rounded bg-muted-foreground/10" />
      </div>
      <!-- Chip placeholder -->
      <div class="absolute top-2.5 left-2.5 h-5 w-20 rounded-md bg-muted-foreground/15 animate-pulse" />
    </div>

    <!-- Body -->
    <div class="px-3.5 pt-3 pb-3 space-y-2 animate-pulse">
      <div class="h-3 w-3/4 rounded bg-muted-foreground/20" />
      <div class="flex items-center gap-2">
        <div class="h-2 w-12 rounded bg-muted-foreground/15" />
        <div class="h-3 w-3 rounded-full bg-muted-foreground/15" />
        <div class="h-2 w-16 rounded bg-muted-foreground/10 flex-1" />
        <div class="h-2 w-10 rounded bg-muted-foreground/15" />
      </div>
    </div>
  </div>
</template>
