# GitHub Synchronization & Remote Push Plan

This plan establishes the secure procedure to authenticate with GitHub via a Personal Access Token (PAT) and push the prepared commit (`feat: sincronización supabase desde ai studio`) to `https://github.com/Manuel-guille07/tienda-iglesia` on branch `main`.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> To execute `git push origin main` securely in the cloud environment, you will provide a GitHub Personal Access Token (Classic with `repo` scope, or Fine-grained with `Contents: Read and write` permission).
> 
> - **Confirmed Method**: Authenticate git push using a GitHub Personal Access Token.
> - **Credential Safety**: The token will only be used in memory for the authenticated push command (`git push https://<TOKEN>@github.com/...`) and will never be committed to repository files or persistent history.
> - **Local Changes Status**:
>   - `git add .` is already completed.
>   - `git commit -m "feat: sincronización supabase desde ai studio"` is already created.
>   - The `.env` file containing your Supabase credentials remains completely protected and excluded by `.gitignore`.

---

## 1. Overview & Core Concept

- **What It Does**: Pushes all current application changes (Vite SPA config fixes, client-safe environment handling, and resilient Supabase integration) from AI Studio to your GitHub repository `Manuel-guille07/tienda-iglesia` on the `main` branch.
- **Repository Target**: `https://github.com/Manuel-guille07/tienda-iglesia.git`
- **Branch Target**: `main`

---

## 2. Key Product Decisions & Trade-Offs

- **Decision 1: Authenticated Push URL vs Stored Global Credentials**
  - *Chosen Approach*: Execute `git push https://<TOKEN>@github.com/Manuel-guille07/tienda-iglesia.git main` with the remote URL restored to `https://github.com/Manuel-guille07/tienda-iglesia.git` immediately after.
  - *Why*: Ensures the token is never saved on disk, in `.git/config`, or in log files.
  - *Alternatives Considered*: Storing token in git credential store or ssh keys (adds persistent disk footprint in an ephemeral container).

- **Decision 2: Safety of Secret Files**
  - *Chosen Approach*: Strict adherence to `.gitignore`.
  - *Why*: Prevents your live Supabase API key and URL from being pushed to GitHub.

---

## 3. Technical Architecture & Push Flow

```
┌─────────────────────────────────────────────────────────┐
│                 AI Studio Applet Workspace              │
│                                                         │
│  [Committed Code] ────► [Git Local main: ef4c5d4]      │
│  (.env ignored)                                         │
└────────────────────────────┬────────────────────────────┘
                             │ Authenticated Push
                             │ (via GitHub PAT)
                             ▼
┌─────────────────────────────────────────────────────────┐
│              GitHub Remote Repository                   │
│         Manuel-guille07/tienda-iglesia:main             │
│                                                         │
│  ✓ Vite configuration & scripts                         │
│  ✓ Resilient Supabase client & DB services              │
│  ✓ POS, Tab, and Arqueo components                     │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Execution Steps Upon Approval

1. Ask you for the GitHub Personal Access Token (or you can paste it directly when approving).
2. Execute:
   ```bash
   git push https://<TOKEN>@github.com/Manuel-guille07/tienda-iglesia.git main
   ```
3. Reset the remote origin back to `https://github.com/Manuel-guille07/tienda-iglesia.git` so no token persists in `.git/config`.
4. Verify remote synchronization status and confirm successful delivery.
