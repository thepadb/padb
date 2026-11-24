// PROTOTYPE (issue #41): the sample form's fields and fake validation. Nothing is saved.
import { Form } from '@base-ui/react/form';
import type * as React from 'react';
import { useState } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { Field, FieldDescription, FieldError, FieldLabel, Input } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { statusName } from '@/lib/status';
import { cn } from '@/lib/utils';
import { allCountries } from './data';

const STATUSES = [
    'announced',
    'under_construction',
    'operating',
    'refurbishing',
    'sbno',
    'closed',
    'demolished',
] as const;
const statusItems = STATUSES.map(value => ({ value, label: statusName(value) }));
const PARTIAL_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

type Errors = Record<string, string>;

export const EXAMPLE_ERRORS: Errors = {
    name: 'Enter the Park’s name.',
    country: 'Choose the country the Park is in.',
    began: 'Use 2024, 2024-04 or 2024-04-12.',
    website: 'Enter a full address, starting https://',
};

function validate(values: Record<string, unknown>): Errors {
    const errors: Errors = {};
    const text = (key: string) => String(values[key] ?? '').trim();
    if (!text('name')) errors.name = EXAMPLE_ERRORS.name;
    if (!values.country) errors.country = EXAMPLE_ERRORS.country;
    if (text('began') && !PARTIAL_DATE.test(text('began'))) errors.began = EXAMPLE_ERRORS.began;
    if (text('website') && !/^https?:\/\/\S+\.\S+/.test(text('website'))) errors.website = EXAMPLE_ERRORS.website;
    return errors;
}

export function useSampleForm() {
    const [errors, setErrors] = useState<Errors>({});
    const [saved, setSaved] = useState(false);
    return {
        errors,
        saved,
        showErrors: () => setErrors(EXAMPLE_ERRORS),
        onFormSubmit: (values: Record<string, unknown>) => {
            const found = validate(values);
            setErrors(found);
            setSaved(Object.keys(found).length === 0);
        },
    };
}

export function SampleForm({
    state,
    className,
    actions,
}: {
    state: ReturnType<typeof useSampleForm>;
    className?: string;
    actions: React.ReactNode;
}) {
    return (
        <Form
            errors={state.errors}
            onFormSubmit={state.onFormSubmit}
            className={cn('grid gap-5', className)}
            noValidate
        >
            <Field name="name">
                <FieldLabel>Name</FieldLabel>
                <Input placeholder="e.g. Hollowmere Adventure Park" />
                <FieldError />
            </Field>
            <Field name="original_name">
                <FieldLabel>Original Name</FieldLabel>
                <Input placeholder="In the language the Park uses" />
                <FieldDescription>Leave blank if it’s the same as the name.</FieldDescription>
            </Field>
            <Field name="country">
                <FieldLabel>Country</FieldLabel>
                <Combobox
                    items={allCountries}
                    name="country"
                    placeholder="Search countries"
                    empty="No country found."
                />
                <FieldError />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
                <Field name="status">
                    <FieldLabel>Status</FieldLabel>
                    <Select items={statusItems} name="status" placeholder="Choose a Status" defaultValue="operating" />
                </Field>
                <Field name="began">
                    <FieldLabel>Since</FieldLabel>
                    <Input placeholder="2024, 2024-04 or 2024-04-12" inputMode="numeric" />
                    <FieldError />
                </Field>
            </div>
            <Field name="website">
                <FieldLabel>Website</FieldLabel>
                <Input type="url" placeholder="https://" />
                <FieldError />
            </Field>
            {state.saved && (
                <p className="text-sm font-medium text-primary">Looks good. Nothing was saved: this is a prototype.</p>
            )}
            {actions}
        </Form>
    );
}
