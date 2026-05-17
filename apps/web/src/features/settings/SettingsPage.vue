<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <PageHeader title="Settings" />

    <div class="flex-1 overflow-auto px-6 py-6">
      <div class="max-w-2xl space-y-6">
        <!-- Profile -->
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Identity used across your workspace.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Field label="Name" :value="auth.userName ?? '—'" />
            <Field label="Email" :value="auth.userEmail ?? '—'" />
            <Field label="Role" :value="auth.userRole ?? 'member'" mono />
          </CardContent>
        </Card>

        <!-- Workspace -->
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>The org that owns your projects and issues.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Field label="Workspace ID" :value="auth.orgId ?? '—'" mono />
            <Field label="User ID" :value="auth.userId ?? '—'" mono />
          </CardContent>
        </Card>

        <!-- Coming soon -->
        <Card>
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
            <CardDescription>Members, integrations, AI rules, billing.</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">
              Full workspace administration ships in Phase 2.
            </p>
          </CardContent>
        </Card>

        <!-- Danger zone -->
        <Card class="border-destructive/30">
          <CardHeader>
            <CardTitle class="text-destructive">Sign out</CardTitle>
            <CardDescription>
              End this session on this browser. You can sign back in any time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" @click="signOut">Sign out</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@deveprobe/ui";
import PageHeader from "@/features/workspace-shell/components/PageHeader.vue";
import Field from "@/features/settings/components/Field.vue";
import { useAuthStore } from "@/features/auth/auth.store.js";

const auth = useAuthStore();
const router = useRouter();

function signOut() {
  auth.logout();
  router.push("/login");
}
</script>
