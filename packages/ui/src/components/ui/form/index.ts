// Re-export vee-validate's Form helpers and the styled shadcn-vue Field
// wrappers as a single coherent surface.
export { useForm } from 'vee-validate';
export { toTypedSchema } from '@vee-validate/zod';

export { default as FormField }       from './FormField.vue';
export { default as FormItem }        from './FormItem.vue';
export { default as FormLabel }       from './FormLabel.vue';
export { default as FormControl }     from './FormControl.vue';
export { default as FormDescription } from './FormDescription.vue';
export { default as FormMessage }     from './FormMessage.vue';
