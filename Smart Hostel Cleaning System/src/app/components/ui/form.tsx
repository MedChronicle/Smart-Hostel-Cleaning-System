"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "./utils";
import { Label } from "./label";

const Form = FormProvider;

/* -------------------------------------------------------------------------- */
/*  Contexts                                                                  */
/* -------------------------------------------------------------------------- */

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

// `null` default lets us detect usage outside <FormField> reliably.
const FormFieldContext = React.createContext<FormFieldContextValue | null>(
  null,
);

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/*  FormField                                                                 */
/* -------------------------------------------------------------------------- */

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  const value = React.useMemo(
    () => ({ name: props.name }) as FormFieldContextValue,
    [props.name],
  );

  return (
    <FormFieldContext.Provider value={value}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

/* -------------------------------------------------------------------------- */
/*  useFormField                                                              */
/* -------------------------------------------------------------------------- */

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();

  // Guards run BEFORE touching the contexts (the original checked too late).
  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }
  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>");
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

/* -------------------------------------------------------------------------- */
/*  FormItem                                                                  */
/* -------------------------------------------------------------------------- */

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  const value = React.useMemo(() => ({ id }), [id]);

  return (
    <FormItemContext.Provider value={value}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  FormLabel: optional required asterisk                                     */
/* -------------------------------------------------------------------------- */

type FormLabelProps = React.ComponentProps<typeof LabelPrimitive.Root> & {
  /** Show a red asterisk after the label. */
  required?: boolean;
};

function FormLabel({
  className,
  required,
  children,
  ...props
}: FormLabelProps) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-destructive ml-0.5">
          *
        </span>
      )}
    </Label>
  );
}

/* -------------------------------------------------------------------------- */
/*  FormControl: only references the message id when it will actually exist   */
/* -------------------------------------------------------------------------- */

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      aria-errormessage={error ? formMessageId : undefined}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  FormDescription                                                           */
/* -------------------------------------------------------------------------- */

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  FormMessage: announced to screen readers when an error appears            */
/* -------------------------------------------------------------------------- */

function FormMessage({ className, children, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : children;

  if (!body) {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      role={error ? "alert" : undefined}
      aria-live={error ? "polite" : undefined}
      className={cn("text-destructive text-sm", className)}
      {...props}
    >
      {body}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*  FormFieldItem: field + item + label + control + description + message     */
/* -------------------------------------------------------------------------- */

type FormFieldItemProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
  label?: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  className?: string;
  /** Receives react-hook-form's `field`; return the input element. */
  render: (
    field: Parameters<ControllerProps<TFieldValues, TName>["render"]>[0]["field"],
  ) => React.ReactElement;
};

/**
 * <FormFieldItem
 *   name="email"
 *   label="Email"
 *   description="We'll never share it."
 *   required
 *   render={(field) => <Input type="email" {...field} />}
 * />
 */
function FormFieldItem<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  description,
  required,
  className,
  render,
}: FormFieldItemProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel required={required}>{label}</FormLabel>}
          <FormControl>{render(field)}</FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  FormErrorSummary: lists all errors, focuses first one after a failed submit */
/* -------------------------------------------------------------------------- */

function flattenErrors(
  errors: FieldErrors,
  prefix = "",
): { name: string; message: string }[] {
  return Object.entries(errors).flatMap(([key, value]) => {
    if (!value || typeof value !== "object") return [];
    const path = prefix ? `${prefix}.${key}` : key;
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string" && message) {
      return [{ name: path, message }];
    }
    return flattenErrors(value as FieldErrors, path);
  });
}

function FormErrorSummary({
  className,
  title = "Please fix the following:",
  ...props
}: React.ComponentProps<"div"> & { title?: string }) {
  const {
    formState: { errors, submitCount },
    setFocus,
  } = useFormContext();
  const ref = React.useRef<HTMLDivElement>(null);
  const list = flattenErrors(errors);

  // Move focus to the first invalid field after each failed submit.
  React.useEffect(() => {
    if (submitCount > 0 && list.length > 0) {
      try {
        setFocus(list[0].name);
      } catch {
        ref.current?.focus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);

  if (list.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      data-slot="form-error-summary"
      className={cn(
        "border-destructive/50 bg-destructive/5 text-destructive rounded-md border p-3 text-sm",
        className,
      )}
      {...props}
    >
      <p className="font-medium">{title}</p>
      <ul className="mt-1 list-disc pl-5">
        {list.map((e) => (
          <li key={e.name}>{e.message}</li>
        ))}
      </ul>
    </div>
  );
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  FormFieldItem,
  FormErrorSummary,
};
