<!--
  IssuePageSkeleton
  ─────────────────
  Placeholder for /issue/:id while the issue query is pending. Mirrors the
  real layout (hero card → url line → title → description → details card →
  activity feed) so the page doesn't reflow when content arrives.

  Pulse animation lives on the inner bars/blocks; the surrounding chrome
  (rounded cards, borders) stays steady to avoid flicker.
-->
<template>
  <div aria-hidden="true" class="max-w-5xl mx-auto px-8 py-8 space-y-8">
    <!-- Hero card -->
    <div class="rounded-2xl border border-border bg-card overflow-hidden">
      <div class="aspect-video bg-muted/40 animate-pulse" />
    </div>

    <!-- URL line -->
    <div class="flex items-center justify-between gap-3 animate-pulse">
      <div class="h-3 w-48 rounded bg-muted-foreground/15" />
      <div class="h-5 w-24 rounded-md bg-muted-foreground/15" />
    </div>

    <!-- Title + description -->
    <div class="space-y-4 animate-pulse">
      <div class="h-9 w-2/3 rounded bg-muted-foreground/20" />
      <div class="space-y-2">
        <div class="h-3 w-full   rounded bg-muted-foreground/10" />
        <div class="h-3 w-11/12  rounded bg-muted-foreground/10" />
        <div class="h-3 w-3/4    rounded bg-muted-foreground/10" />
      </div>
    </div>

    <!-- Details card -->
    <div class="rounded-xl border border-border bg-card/40 px-5 py-4 space-y-4">
      <div class="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4 animate-pulse">
        <div v-for="i in 4" :key="i" class="space-y-2">
          <div class="h-2.5 w-16 rounded bg-muted-foreground/15" />
          <div class="h-4 w-24 rounded bg-muted-foreground/20" />
        </div>
      </div>
      <div class="space-y-2 animate-pulse">
        <div class="h-2.5 w-10 rounded bg-muted-foreground/15" />
        <div class="flex gap-1.5">
          <div class="h-6 w-16 rounded-md bg-muted-foreground/15" />
          <div class="h-6 w-12 rounded-md bg-muted-foreground/15" />
          <div class="h-6 w-20 rounded-md bg-muted-foreground/15" />
        </div>
      </div>
    </div>

    <!-- Activity placeholder — created event + a couple of comments -->
    <div class="space-y-4 animate-pulse">
      <div class="flex items-center gap-3">
        <div class="h-7 w-7 rounded-full bg-muted-foreground/20" />
        <div class="h-3 w-1/3 rounded bg-muted-foreground/15" />
      </div>
      <div v-for="i in 2" :key="i" class="flex items-start gap-3">
        <div class="h-7 w-7 rounded-full bg-muted-foreground/20 shrink-0" />
        <div class="flex-1 rounded-lg bg-muted/40 px-4 py-3 space-y-1.5">
          <div class="h-3 w-1/4 rounded bg-muted-foreground/15" />
          <div class="h-3 w-full rounded bg-muted-foreground/10" />
          <div class="h-3 w-2/3 rounded bg-muted-foreground/10" />
        </div>
      </div>
    </div>
  </div>
</template>
