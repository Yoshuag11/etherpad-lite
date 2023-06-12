import Form from "./Form";

export default function SignUp() {
  return (
    <Form action="/sign_up" method="POST" rootClass="app-form-container">
      <fieldset>
        <legend>New User Form</legend>
        <div>
          <label htmlFor="username">Username&nbsp;</label>
          <input
            autoComplete="username"
            id="username"
            name="username"
            required
            type="text"
          />
        </div>
        <div>
          <label htmlFor="password">Password&nbsp;</label>
          <input
            autoComplete="new-password"
            id="password"
            name="password"
            required
            type="password"
          />
        </div>
        <div>
          <label htmlFor="name">Name&nbsp;</label>
          <input autoComplete="given-name" id="name" name="name" type="text" />
        </div>
      </fieldset>
      <button type="submit">Create account</button>
    </Form>
  );
}
