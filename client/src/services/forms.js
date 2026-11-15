export async function submitForm(event, onSubmit, action, actor) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const completed = await onSubmit(action, { ...values, actor });
    if (completed)
        form.reset();
    return completed;
}
