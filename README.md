# AstraFlow

AstraFlow is a control and management system for working with Astra-based streaming infrastructure.

The project is designed to simplify the management of streaming nodes, configurations, connections, and related data through a convenient web interface and backend service. It combines a Go backend with a React frontend and uses a local database to store application data and settings.

## Purpose

AstraFlow is intended for:

- managing Astra nodes and their configuration
- visualizing and controlling streaming workflows
- storing application data in a local database
- providing a frontend interface for administration and monitoring

## Technologies

- **Backend:** Go
- **Frontend:** ReactJS + ReactFlow
- **Database:** SQLite3

---

## Build Instructions

### 1. Clone the repository

```bash
git clone https://github.com/unidiag/astraflow.git
cd astraflow
```

### 2. Install frontend dependencies

```bash
cd frontend
npm update
```

### 3. Return to the project root and build the application

```bash
cd ..
./make
```

### 4. Build result
After a successful build, the executable file will be created in the project root:

```bash
./astraflow
```

## Running the Application

You can run AstraFlow without parameters:

```bash
./astraflow
```

In this case, the default database file will be used:

```bash
./astraflow.db
```

You can also specify a custom database file as the second startup parameter.

### Example:

```bash
./astraflow mydatabase.db
```

If the specified database file does not exist, it will be created automatically.

## Notes

- If no database parameter is provided, AstraFlow uses ./astraflow.db by default.
- If the database file does not exist, it will be created automatically on startup.
- Make sure Node.js, npm, and Go are installed on your system before building the project.

## License

This project is licensed under the MIT License. Commercial use is allowed.
The software is provided "as is", without warranty of any kind, and the author
is not liable for any damages or other claims arising from its use.
