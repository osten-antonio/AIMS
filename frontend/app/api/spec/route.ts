import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  const { data: spec } = await axios.get(
    `http://${process.env.BACKEND_HOSTNAME}:${process.env.BACKEND_PORT}/openapi.json`
  );

  const pathMap: Record<string, string> = {
    "/user/login": "/api/session",

    // Solver
    "/solver/solve": "/api/solver",

    // Ingestion
    "/ingestion/text": "/api/ingestion/text",
    "/ingestion/image": "/api/ingestion/image",

    // Explanation
    "/explanation/steps/": "/api/explanation/steps",
    "/explanation/hint/": "/api/explanation/hint",
    "/explanation/generate/": "/api/explanation/generate",
    "/explanation/follow-up/": "/api/explanation/follow-up",

    // Practice
    "/practice/generate/": "/api/practice/generate",
    "/practice/refresh/": "/api/practice/refresh",

    // Statistics
    "/statistics/{operation}": "/api/statistics/{operation}",

    // User
    "/user/profile": "/api/user/profile",
    "/user/update-username": "/api/user/update-username",
    "/user/delete-history": "/api/user/delete-history",
  };

  // Only include backend paths that actually have a frontend route.
  const remappedPaths: Record<string, unknown> = {};
  for (const [backendPath, frontendPath] of Object.entries(pathMap)) {
    if (spec.paths?.[backendPath]) {
      remappedPaths[frontendPath] = spec.paths[backendPath];
    }
  }

  return NextResponse.json({
    ...spec,
    servers: [{ url: "" }],
    paths: remappedPaths,
  });
}