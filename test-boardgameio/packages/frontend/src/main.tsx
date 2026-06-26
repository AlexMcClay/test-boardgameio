import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import "./styles.css";
import reportWebVitals from "./reportWebVitals.ts";
import { randomIDGen } from "@project/shared";



function generateUserName(userId: string): string {
  const animals = [
    "Lion",
    "Tiger",
    "Bear",
    "Wolf",
    "Eagle",
    "Shark",
    "Panther",
    "Falcon",
    "Dragon",
    "Phoenix",
    "Unicorn",
    "Griffin",
    "Pegasus",
    "Cheetah",
  ];
  const attributes = [
    "Brave",
    "Cunning",
    "Swift",
    "Fierce",
    "Mighty",
    "Noble",
    "Wise",
    "Fearless",
    "Valiant",
    "Gallant",
    "Dumb",
    "Silly",
    "Lazy",
    "Clumsy",
    "Sneaky",
  ];
  return `${attributes[Math.floor(Math.random() * attributes.length)]}_${animals[Math.floor(Math.random() * animals.length)]}`;
}

function ensureUser(): {id: string, name: string} | undefined {
  const existingUserId = localStorage.getItem("user_id");
  const existingUserName = localStorage.getItem("user_name");
  if (existingUserId && existingUserName) return { id: existingUserId, name: existingUserName };
  
  const newUserId = randomIDGen();
  const newUserName = generateUserName(newUserId);
  localStorage.setItem("user_id", newUserId);
  localStorage.setItem("user_name", newUserName);
  return { id: newUserId, name: newUserName };
}

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  ensureUser();

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
