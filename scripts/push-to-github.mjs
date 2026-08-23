import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import fs from "fs";
import path from "path";

const dir = process.cwd();
const url = "https://github.com/phanupmxd1-hub/GradeD.git";
const token = process.argv[2] || process.env.GITHUB_TOKEN;

async function initAndPush() {
  console.log("1. Initializing Git repository in", dir);
  await git.init({ fs, dir });

  console.log("2. Staging all files...");
  
  // Recursive add files respecting gitignore
  const ignorePatterns = [
    ".git",
    "node_modules",
    ".next",
    "out",
    "data",
    ".env.local"
  ];

  function getAllFiles(currentDir, relativePath = "") {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      if (ignorePatterns.includes(entry.name) || entry.name.endsWith(".db") || entry.name.endsWith(".db-wal") || entry.name.endsWith(".db-shm")) {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      const rel = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        files = files.concat(getAllFiles(fullPath, rel));
      } else {
        files.push(rel);
      }
    }
    return files;
  }

  const filesToAdd = getAllFiles(dir);
  console.log(`Found ${filesToAdd.length} files to commit.`);

  for (const file of filesToAdd) {
    await git.add({ fs, dir, filepath: file });
  }

  console.log("3. Creating commit...");
  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: "phanupmxd1-hub",
      email: "phanupmxd1@users.noreply.github.com"
    },
    message: "Initial commit: GradeD Portal with SQLite, Supabase migrations, and Next.js"
  });
  console.log("Commit created:", sha);

  await git.branch({ fs, dir, ref: "main", object: sha, force: true });
  await git.writeRef({ fs, dir, ref: "refs/heads/main", value: sha, force: true });

  console.log("4. Setting remote origin:", url);
  try {
    await git.addRemote({ fs, dir, remote: "origin", url, force: true });
  } catch (e) {
    // Remote might already exist
  }

  if (!token) {
    console.log("\n⚠️ กรุณาส่ง GitHub Personal Access Token (PAT) มาเพื่อทำการ Push ไปยัง GitHub:");
    console.log("   node scripts/push-to-github.mjs <YOUR_GITHUB_TOKEN>");
    return;
  }

  console.log("5. Pushing to GitHub repository...");
  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: "origin",
    ref: "main",
    onAuth: () => ({
      username: "phanupmxd1-hub",
      password: token
    })
  });

  console.log("✅ Push completed successfully!", pushResult);
}

initAndPush().catch(err => {
  console.error("❌ Git Error:", err);
});
