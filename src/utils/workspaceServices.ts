/**
 * Google Tasks & Workspace API Helpers
 */

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
  updated?: string;
}

/**
 * List all Google Tasks Lists
 */
export async function listTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const res = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("UNAUTHORIZED: Tu sesión de Google ha expirado.");
    }
    const text = await res.text();
    throw new Error(`Error loading Task Lists: ${text}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Create a new Google Tasks List
 */
export async function createTaskList(accessToken: string, title: string): Promise<GoogleTaskList> {
  const res = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("UNAUTHORIZED: Tu sesión de Google ha expirado.");
    }
    const text = await res.text();
    throw new Error(`Error creating Task List: ${text}`);
  }

  return await res.json();
}

/**
 * List tasks in a Task List
 */
export async function listTasks(accessToken: string, listId: string): Promise<GoogleTask[]> {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("UNAUTHORIZED: Tu sesión de Google ha expirado.");
    }
    const text = await res.text();
    throw new Error(`Error loading tasks: ${text}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Create a new Task
 */
export async function createTask(
  accessToken: string,
  listId: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: task.title,
      notes: task.notes,
      due: task.due, // Needs to be RFC 3339 formatted timestamp (e.g., yyyy-mm-ddT00:00:00Z)
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("UNAUTHORIZED: Tu sesión de Google ha expirado.");
    }
    const text = await res.text();
    throw new Error(`Error creating task: ${text}`);
  }

  return await res.json();
}

/**
 * Update task status (Complete / Uncomplete)
 */
export async function updateTaskStatus(
  accessToken: string,
  listId: string,
  taskId: string,
  status: "needsAction" | "completed"
): Promise<GoogleTask> {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: taskId,
      status: status,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("UNAUTHORIZED: Tu sesión de Google ha expirado.");
    }
    const text = await res.text();
    throw new Error(`Error updating task status: ${text}`);
  }

  return await res.json();
}

/**
 * Delete a task
 */
export async function deleteTask(accessToken: string, listId: string, taskId: string): Promise<void> {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("UNAUTHORIZED: Tu sesión de Google ha expirado.");
    }
    const text = await res.text();
    throw new Error(`Error deleting task: ${text}`);
  }
}

/**
 * Try to create a Google Keep note. Since the Google Keep API requires enterprise/workspace credentials,
 * this function is built with fallback capability handled gracefully in the client UI.
 */
export async function createGoogleKeepNote(
  accessToken: string,
  note: { title: string; text: string }
): Promise<any> {
  const res = await fetch("https://keep.googleapis.com/v1/notes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: note.title,
      body: {
        text: {
          text: note.text,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Keep API Error: ${text}`);
  }

  return await res.json();
}
