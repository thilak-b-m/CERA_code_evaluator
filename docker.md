# Docker setup for CERA

## Do I need Docker?

Docker is **not required to create assignments, manage students, submit source code, or review work**. The backend uses MongoDB for those workflows.

Docker is required only for the **Run Code** feature. The API runs submitted programs in isolated containers instead of executing them on the API host. Without Docker running and the language images available, the run endpoint returns `503`; assignments and submissions remain usable.

## Windows setup

1. Install **Docker Desktop for Windows** from the official Docker website.
2. During setup, use the **WSL 2 backend** (recommended) and install/enable WSL 2 if Docker Desktop prompts you to do so.
3. Start Docker Desktop and wait until it reports that the engine is running. The project uses Linux containers; if Docker Desktop is set to Windows containers, switch it to Linux containers.
4. Open a new PowerShell terminal and verify the CLI can reach the engine:

   ```powershell
   docker version
   docker info
   docker run --rm hello-world
   ```

   `docker version` should show both Client and Server sections. If the Server section is missing, Docker Desktop is not running or its Linux engine is not ready.

5. Pull the runtime images used by this project. Do this from any directory:

   ```powershell
   docker pull python:3.12-alpine
   docker pull node:22-alpine
   docker pull eclipse-temurin:21-jdk
   docker pull gcc:14
   ```

   These images are several hundred MB in total. Pulling them before running student code avoids a first-run image download delay.

## Connect the backend to Docker

The backend launches Docker using the `docker` command. If `docker version` works in the same PowerShell environment that starts the backend, no extra setting is needed. Restart the terminal after installing Docker Desktop so its `PATH` is refreshed, then restart the backend.

If the backend cannot find Docker, set `DOCKER_BIN` in `backend/.env` to the installed Docker CLI path. For a typical Docker Desktop installation:

```dotenv
DOCKER_BIN='C:\Program Files\Docker\Docker\resources\bin\docker.exe'
```

Use the actual path on your machine if Docker Desktop was installed elsewhere. Restart the backend after changing `.env`. Do not put secrets in `DOCKER_BIN`; keep local environment files uncommitted.

Keep MongoDB configured separately in `backend/.env` (`MONGODB_URI`, `MONGODB_DB_NAME`, and `JWT_SECRET`). Docker Desktop does not replace the MongoDB database setup described in the project README.

## Start CERA

Run MongoDB (Atlas or another supported deployment), then start the API and frontend in separate PowerShell terminals from the repository root:

```powershell
npm run backend:dev
```

```powershell
npm run dev
```

Sign in, create a published assignment with at least one public test case containing standard input and expected output, then open the student code editor and choose **Run Code**. The backend must be able to invoke Docker and the runtime image for the selected language must have been pulled.

## What the runner configures

Each public test case runs in its own container. The runner disables networking, makes the container root filesystem read-only, runs as a non-root user, drops Linux capabilities, and applies CPU, memory, process, output, and per-test time limits. Hidden cases are not run by the student-facing endpoint.

Docker access is powerful: anyone who can control the Docker daemon can generally control the host. Keep the daemon local to a trusted development machine, protect access to the Docker socket/pipe, and do not expose an unauthenticated Docker API over the network. For production or multi-tenant use, operate the runner as a separately managed, hardened service with appropriate monitoring and resource quotas; do not treat a developer's Docker Desktop setup as production hardening.

## Troubleshooting

- **`docker` is not recognized**: restart PowerShell; if it remains unavailable, set `DOCKER_BIN` as shown above.
- **Cannot connect to the Docker daemon / named pipe**: start Docker Desktop and wait for the engine to become ready.
- **`docker version` only shows Client**: check Docker Desktop's engine status and ensure Linux containers are enabled.
- **Image not found or pull access error**: retry the corresponding `docker pull` command and verify network access to Docker Hub.
- **Run Code returns `503`**: check the backend terminal for the explicit worker error; verify Docker is available from the backend's environment and that the image for the selected language is present.
- **Assignment creation fails**: Docker is unrelated to assignment creation. Check the error shown on the create form, backend availability, MongoDB connectivity, required title/course/description/due date/points, and that any time limit is a whole number of minutes from 0 through 600.

Remove unused images with Docker Desktop or Docker's image-management commands when you need disk space. Do not remove images while students are actively using the runner.
