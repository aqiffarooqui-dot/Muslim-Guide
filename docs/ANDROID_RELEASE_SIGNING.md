# Muslim Guide — Production Android Signing

The Android workflow on `main` supports stable production signing and in-app APK update installation.

## Important

**Never commit the `.jks` keystore, passwords, or private signing material to GitHub.** Keep the keystore backed up securely. If the keystore is lost, future APKs cannot update installations signed with it.

## 1. Create the production keystore on your Windows PC

Open PowerShell in the project folder. Make sure Java/JDK is installed and `keytool` is available.

```powershell
keytool -genkeypair -v -keystore muslim-guide-release.jks -alias muslim-guide -keyalg RSA -keysize 2048 -validity 10000
```

Choose a strong keystore password and key password and store them safely. Use alias `muslim-guide` unless you have a reason to change it.

## 2. Convert the keystore to Base64

In PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("muslim-guide-release.jks")) | Set-Clipboard
```

The Base64 value is now in your clipboard.

## 3. Add four GitHub Actions secrets

Open the repository's **Settings → Secrets and variables → Actions → New repository secret**.

Create these exact names:

- `ANDROID_KEYSTORE_BASE64` — paste the Base64 value from step 2
- `ANDROID_KEYSTORE_PASSWORD` — the keystore password
- `ANDROID_KEY_ALIAS` — `muslim-guide`
- `ANDROID_KEY_PASSWORD` — the key password

Do not put these values in source code, `.env`, README files, issues, or chat.

## 4. Trigger the build

After the secrets are saved, push any normal change to `main`, or manually run the **Build Muslim Guide Android APK** workflow from GitHub Actions.

The workflow will:

1. build the web app;
2. prepare/sync Android;
3. inject the native updater;
4. assign a new versionCode/versionName;
5. build a signed release APK;
6. upload the APK as an Actions artifact;
7. publish a GitHub Release containing the APK.

## 5. Updating an installed app

The app's **Settings → App Update** checks the latest GitHub Release. The native Android updater downloads the APK and opens Android's package installer. Android may require the user to allow installation from this source and confirm the update.

The update APK must use the **same signing key** as the installed production app and must have a higher versionCode.

## 6. First production release

If you currently have a debug APK installed, uninstall it before installing the first production-signed APK. A debug APK normally cannot be upgraded by a differently signed production APK.

## 7. Recommended backup

Keep at least two secure backups of `muslim-guide-release.jks`. Do not store either backup inside the Git repository.
