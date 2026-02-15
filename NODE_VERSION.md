# Node Version Setup

## Required Version
This project requires **Node.js 18 or higher**.

## Automatic Version Switching with nvm

### Setup (One-time)
If you're using nvm (Node Version Manager), enable automatic version switching:

**For Zsh (default on macOS):**
Add this to your `~/.zshrc`:
```bash
# Auto-switch Node version when entering directory with .nvmrc
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

Then reload your shell:
```bash
source ~/.zshrc
```

**For Bash:**
Add this to your `~/.bashrc` or `~/.bash_profile`:
```bash
# Auto-switch Node version when entering directory with .nvmrc
cdnvm() {
    command cd "$@";
    nvm_path=$(nvm_find_nvmrc)

    if [[ -n $nvm_path ]]; then
        nvm_version=$(nvm version)
        nvmrc_version=$(cat "${nvm_path}")

        if [ "$nvm_version" != "$nvmrc_version" ]; then
            nvm use
        fi
    fi
}
alias cd='cdnvm'
cd "$PWD"
```

### Manual Usage
If you don't want auto-switching, run this when entering the project:
```bash
nvm use
```

This will read the `.nvmrc` file and switch to Node 18.

### Install Node 18
If you don't have Node 18 installed:
```bash
nvm install 18
nvm use 18
```

## Verification
Check your current Node version:
```bash
node --version  # Should show v18.x.x
```

## Why Node 18?
- Many dependencies (Jest, Express, Vite, etc.) require Node 18+
- Better performance and security features
- Long-term support (LTS) until April 2025

## Troubleshooting
If you see "Unsupported engine" warnings:
1. Check your Node version: `node --version`
2. If it's < 18, run: `nvm use 18` (or enable auto-switching above)
3. If you don't have nvm, install it: https://github.com/nvm-sh/nvm
