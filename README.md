# Monitoring Frontend

This repository is for the frontend application of the **HEI Monitoring Subsystem**. This application is developed mainly using **ReactJS** and is using **npm** for node package manager.

## Prerequisite

1. [Git](https://git-scm.com/downloads)
2. [Node JS v24.12.0](https://nodejs.org/en/download)

## How to install

- Clone the repository.

```
    git clone https://<your-username>@bitbucket.org/chareze-hirang/monitoring-frontend.git
```

- Go to the project directory and install dependencies.

```
    cd monitoring-frontend
    npm install
```

- Copy the `.env` file by copying the `.env.example` file.

```
    // for Unix
    cp .env.format .env
    // for Windows
    copy .env.format .env
```

- Supply the URL of the backend to the `.env`

```
    VITE_BACKEND_URL=http://localhost:8000
```

- Run the development server

```
    npm run dev
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)
