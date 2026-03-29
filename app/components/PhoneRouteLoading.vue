<template>
  <div class="flex h-full min-h-0 items-center justify-center px-6 py-10" data-phone-route-loading>
    <ContainerCard
      class="w-full max-w-xl border-dashed py-8 shadow-none"
      padding="comfortable"
      variant="subtle"
    >
      <div aria-hidden="true" class="mx-auto flex w-full max-w-sm flex-col gap-4">
        <div class="h-2 w-20 animate-pulse rounded-full bg-text-subtle/15" />
        <div class="grid gap-3">
          <div
            class="h-14 animate-pulse rounded-md border border-border-subtle bg-surface-muted/70"
          />
          <div class="grid grid-cols-2 gap-3">
            <div
              class="h-24 animate-pulse rounded-md border border-border-subtle bg-surface-muted/60"
            />
            <div
              class="h-24 animate-pulse rounded-md border border-border-subtle bg-surface-muted/45"
            />
          </div>
        </div>
      </div>
    </ContainerCard>
  </div>
</template>
