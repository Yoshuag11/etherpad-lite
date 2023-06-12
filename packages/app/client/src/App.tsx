import { useEffect, useMemo, useState } from "react";
import SignUpForm from "./SignUpForm";
import LogInForm from "./LogInForm";

export default function App() {
  const [signUp, setSignUp] = useState(false);
  const [padId, setPadId] = useState<string>();
  const [sessionId, setSessionId] = useState<string | false>(() => {
    const currentSessionId = document.cookie
      .split(";")
      .filter((cookie) => cookie.trim().startsWith("sessionID"))
      .join();

    if (currentSessionId !== "" && !currentSessionId.endsWith("=false")) {
      return currentSessionId.split("=")[1];
    }
    return false;
  });
  const authenticated = sessionId !== false && padId !== undefined;
  const authenticatedContent = useMemo(() => {
    if (authenticated === false) {
      return null;
    }
    return (
      <>
        <iframe
          name="embed_readwrite"
          src={
            `https://${window.location.hostname}:9001/set_session?` +
            `sessionId=${sessionId}&padId=${padId}`
          }
          width="100%"
          height="600"
          title="application_pad"
        ></iframe>
        <div style={{ display: "flex", justifyContent: "end" }}>
          <button
            onClick={() => {
              // remove current session
              document.cookie =
                "sessionID=false; expires=Thu, 01 Jan 1970 00:00:01 GMT";

              // update the app to reflect user has logged out
              setSessionId(false);
            }}
          >
            Log out
          </button>
        </div>
      </>
    );
  }, [authenticated, padId, sessionId]);

  useEffect(() => {
    async function getPadId() {
      const response = await fetch("pad_id");
      const responseData = await response.json();

      setPadId(responseData.padId);
    }
    getPadId();
  }, []);
  const signUpContent = useMemo(() => {
    if (signUp === false || authenticated === true) {
      return null;
    }
    return <SignUpForm />;
  }, [authenticated, signUp]);
  const logInContent = useMemo(() => {
    if (authenticated === true || signUp === true) {
      return null;
    }
    return <LogInForm />;
  }, [authenticated, signUp]);
  return (
    <>
      {logInContent}
      {signUpContent}
      {authenticatedContent}
      {!authenticated && (
        <div style={{ marginTop: "1rem" }}>
          <button
            onClick={() => {
              setSignUp((currentValue) => !currentValue);
            }}
          >
            {signUp === true ? "Return" : "Sign up"}
          </button>
        </div>
      )}
    </>
  );
}
