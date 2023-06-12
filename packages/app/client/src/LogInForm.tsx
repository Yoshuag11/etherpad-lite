import { useState } from "react";
import Form from "./Form";

function LogInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  return (
    <Form
      autoComplete="off"
      action="/authorize"
      rootClass="app-form-container"
      method="POST"
    >
      <fieldset>
        <legend>Log In</legend>
        <div>
          <label htmlFor="user_username">Username&nbsp;</label>
          <input
            autoComplete="username"
            id="user_username"
            name="user_username"
            onChange={(event) => {
              setUsername(event.target.value);
            }}
            required
            type="text"
            value={username}
          />
        </div>
        <div>
          <label htmlFor="user_password">Password&nbsp;</label>
          <input
            autoComplete="current-password"
            id="user_password"
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            name="user_password"
            type="password"
            value={password}
          />
        </div>
      </fieldset>
      <button type="submit">Log In</button>
    </Form>
  );
}
export default LogInForm;
