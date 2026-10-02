Ok, let's work on configuration. Here's how I'd like that to work:
* For clarity, there are user settings, like whether Provena's active, whether to ignore file warnings, which students should be able to update (or the UI updates for them).
* There are classroom settings, like how to authenticate, where the provena server lives, client/secrets if using local authentication, etc. These can come from two different sources:
* 1) Defaults baked into the source code itself. These should be used in the absence of a local config. This lets me make a school-specific version of the extension that students don't need to configure. These should probably come from an .env file that can be .gitignored (that's the current practice), unless you've got a better idea (e.g., json/yaml might be easier to workwith but that also might be overkill)
* 2) Workspace configs that can override it. For example, I might release a no-defaults extension to the marketplace that an instructor can configure by giving students a workspace template that includes preconfigured settings (in settings.json)
* Both instructor override settings and student settings might live in settings.json, but the latter don't need to have default values from .env.
* Since the different auth methods require different info, we need a way to structure the settings/.env file and validate it having the required info.

Can you make a task for config docs/task/config.md and ask any clarifying questions or propose any missing ideas here