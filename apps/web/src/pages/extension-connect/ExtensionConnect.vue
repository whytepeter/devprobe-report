<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
    <Card class="w-full max-w-md">
      <CardHeader>
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-md bg-primary shrink-0">
            <Icon name="package" :size="14" color="#fff" :stroke-width="2" />
          </span>
          <div class="min-w-0">
            <CardTitle class="text-[15px]">Connect extension</CardTitle>
            <CardDescription>Link the DevProbe extension to this workspace.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ConnectStateUnauthed v-if="!auth.isAuthenticated" :return-path="returnPath" />
        <ConnectStateConnected v-else-if="connected" />
        <ConnectStateForm
          v-else
          :initial-ext-id="initialExtId"
          :sending="handoff.sending.value"
          :error="handoff.error.value"
          @submit="onConnect"
        />
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icon,
} from "@deveprobe/ui";
import { useAuthStore } from "@/features/auth/auth.store.js";
import { useExtensionHandoff } from "@/features/extension-connect/composables/useExtensionHandoff.js";
import {
  isValidExtId,
  readStoredExtId,
} from "@/features/extension-connect/utils/extension-id.js";
import ConnectStateUnauthed from "@/features/extension-connect/components/ConnectStateUnauthed.vue";
import ConnectStateForm from "@/features/extension-connect/components/ConnectStateForm.vue";
import ConnectStateConnected from "@/features/extension-connect/components/ConnectStateConnected.vue";

const auth = useAuthStore();
const route = useRoute();
const handoff = useExtensionHandoff();

const connected = ref(false);
const initialExtId = ref(readStoredExtId());

const returnPath = computed(() => {
  const qid = route.query["ext"]?.toString();
  return qid ? `/extension/connect?ext=${qid}` : "/extension/connect";
});

async function onConnect(extId: string) {
  const ok = await handoff.connect(extId, {
    token: auth.token ?? "",
    orgId: auth.orgId ?? "",
    userId: auth.userId ?? null,
  });
  if (ok) connected.value = true;
}

onMounted(async () => {
  if (!auth.isAuthenticated) return;
  const qid = route.query["ext"]?.toString();
  if (qid) {
    initialExtId.value = qid;
    if (isValidExtId(qid)) await onConnect(qid);
  }
});
</script>
