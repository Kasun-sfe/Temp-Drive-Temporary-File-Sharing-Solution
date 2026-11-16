# 🗂️ Temp Drive: Temporary Encrypted File Sharing

A lightweight web app for moving files, links and notes between devices **without a shared network, USB cable, or any sign-up**. Upload, set a password, share the link, and the file expires automatically.

🔗 **Live demo:** https://filesharing.page.gd

---

## ❓ Why I built this

Sometimes you need to get a file from one machine to another, but:

- the devices are not on the same network
- you don't have a data cable or a file-transfer app handy
- you don't want to sign in to personal accounts on a shared or work computer

Temp Drive solves this: any device with a browser and an internet connection can send or receive files in seconds.

## ✨ Features

- 🔒 **Password protection:** set a password on upload; only someone who knows it can open and download the file
- ⏳ **Auto-expiry:** choose how long an item lives: `10 minutes`, `1 hour`, `24 hours`, `3 days` or `7 days`
- 📁 **File uploads:** up to **30 MB** per file
- 📝 **Links and notes:** paste a link or short text and share it the same way
- 📋 **Available items list:** see what's currently stored, with time remaining for each
- 🌐 **No installation, no accounts:** works in any modern browser

## 🚀 How to use

1. Open the site and **drop a file** (or click to choose one).
2. Pick an **expiry time** and, optionally, set a **password**.
3. Click **Upload**, then copy the generated link.
4. On the other device, open the link, enter the password and **download** the file.

To share text or a link instead, use the **"paste a link or note"** box and click **Save**.

## 🎬 Demo

> Add a screenshot or GIF here, e.g.:
>
> `![Demo](docs/demo.gif)`

## 🛠️ Tech stack

> Fill in what you used, for example:
>
> - **Frontend:** HTML, CSS, JavaScript
> - **Backend:** PHP / Node.js / Python (edit this)
> - **Storage:** File system / Database (edit this)
> - **Hosting:** Free hosting (page.gd)

## ⚙️ Run locally

> Adjust these steps to match your stack.

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>

# 2. Install dependencies (if any)
# npm install

# 3. Start the app
# e.g. php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## 🔐 Security notes

- Files and notes are removed automatically once they expire.
- Use a **strong, unique password** and share it through a different channel than the link.
- Do not upload highly sensitive data (IDs, financial documents, credentials). This is a small personal project and has not had a professional security audit.
- Respect copyright: only upload files you have the right to share.

## 🗺️ Roadmap

- [ ] Download counter / one-time download links
- [ ] QR code for the share link
- [ ] Drag-and-drop for multiple files
- [ ] Dark / light theme toggle

## 🤝 Contributing

Suggestions and pull requests are welcome. Open an issue to discuss a bug or an idea first.

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push and open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.

## 👤 Author

**<Your Name>**
LinkedIn: <your-linkedin-url> · GitHub: <your-github-url>

---

⭐ If you found this useful, consider giving the repo a star!
