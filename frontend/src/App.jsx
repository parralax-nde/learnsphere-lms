import React from "react";
import ProfileEdit from "./components/ProfileEdit/ProfileEdit";
import "./App.css";

/**
 * In a real application, the current user's ID and auth token would be
 * obtained from an authentication context (e.g., a JWT decoded from
 * localStorage or a global auth provider).
 *
 * For demonstration purposes we use a placeholder user ID here.
 */
const DEMO_USER_ID = "user-001";

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__logo">LearnSphere LMS</h1>
      </header>
      <main className="app__main">
        <ProfileEdit userId={DEMO_USER_ID} />
      </main>
    </div>
  );
}

export default App;
