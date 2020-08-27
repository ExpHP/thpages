# Settings



### anmmap

Here you can upload anmmaps to change the names displayed across the site.  **Customizing the v8 anmmap is most important** as this is the one that most pages will use. (the other version anmmaps will be used only when looking at tables for older games)

* **raw** &mdash; use names like `ins_301` and `[10023.0f]`.
* **default** &mdash; use a pre-packaged copy of [Priw8's anmmaps](https://github.com/Priw8/eclmap).

<div id="upload-anmmaps"></div>

**(\*)** v2 and v3 can use the same anmmaps.

[script]
onContentLoad(async function() {
  buildSettingsPage();

  document.querySelector('#upload-anmmaps .row.v2 .col.label').innerHTML += ' (*)';
});
[/script]
