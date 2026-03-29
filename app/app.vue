<template>
  <div>
    <NuxtLayout>
      <NuxtPage :transition="{ name: 'route-fade', mode: 'out-in' }" />
    </NuxtLayout>
    <AppConfirmHost />
    <AppOverlayToastHost />
  </div>
</template>

<style>
.route-fade-enter-active,
.route-fade-leave-active {
  transition: opacity 0.14s ease;
}

.route-fade-enter-from,
.route-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .route-fade-enter-active,
  .route-fade-leave-active {
    transition: none;
  }
}
</style>
