# Contributing

## Getting Started

To get started with contributing, please follow these steps:

1. Install the necessary dependencies. Follow the instructions in the [README.md](README.md) file.
2. Create a new branch from `dev` for your changes.

```
    git checkout -b <branch-name>
```

### Branch Naming

We will be following the Gitflow Branch Naming Convention in naming branches.

| Branch Pattern | Description |
|---|---|
| master | The production branch. The branch the live website is serving. |
| dev | The development branch. All feature branches will be merged to this branch for testing. Also the branch the staging website is serving. |
| feature-\* | The branch for each new feature for the app. Must always branch off from `dev` branch and merged back to it. |
| bugfix-\* | The branch used for fixing bugs found on `dev` branch. Must always branch off from `dev` branch and merged back to it. |
| hotfix-\* | The branch used for fixing up bugs found on `master` branch. Must always branch off from `master` branch and merged back to it and to the `dev` branch. |
| release-\* | The branch used for preparing for release. Must branch off from `dev` and must be merged to `master`. |

For feature, bugfix and hotfix branches, additional name must be added for its purpose:

| Pattern | Description |
|---|---|
| (feature,bugfix,hotfix)-component-\* | Component related branches. |
| (feature,bugfix,hotfix)-module-\* | Services, helpers, etc related branches that doesn't touch components. |
| (feature,bugfix,hotfix)-dev-\* | All development enviroment related branch like webpack configs, babel configs, etc. |

**Branch Name Example**

``` feature-dev-contributing ```

3. Make your changes and test them thoroughly.
4. Commit your changes and push them to your branch. Use the built-in version control of your IDE to commit and push or use the command below.
```
git commit . -m "Commit message"
git push origin <branch-name>
```

5. Open a pull request to the repository.

## Guidelines

Please keep the following guidelines in mind while contributing:

- Write clear, concise and specific commit messages.
- Test your changes thoroughly before submitting a pull request.
- Provide a detailed description of your changes in the pull request.
- Pull request destination of `bugfix` branches are to `dev` branch.
- Pull request destination of `hotfix` are to `master` branch.
- Difference between `bugfix` and `hotfix` is that `bugfix` are bugs found in the development branch while `hotfix` are bugs that are already in the production branch (already merged) which is `master`.
