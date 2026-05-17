// shadcn-vue Form internals.
// Provides a tiny context (id + name) so descendants (label, control, message)
// can stay decoupled from each other.
import { type InjectionKey, inject, provide } from 'vue';

export interface FormFieldContext {
  id: string;
  name: string;
}

const FORM_FIELD_KEY: InjectionKey<FormFieldContext> = Symbol('FormFieldContext');

export function provideFormField(ctx: FormFieldContext) {
  provide(FORM_FIELD_KEY, ctx);
}

export function useFormField(): FormFieldContext {
  const ctx = inject(FORM_FIELD_KEY);
  if (!ctx) {
    throw new Error('useFormField must be used within a FormField');
  }
  return ctx;
}

export function formItemIds(id: string) {
  return {
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
  };
}
