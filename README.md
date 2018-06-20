# Node Page Extensions

The idea is to be able to show custom tabular data based on collected performance metrics from certain devices into the node page.

The use case if for those nodes that serve as a container of other devices, like a Wireless Controller that manage multiple Access Points, and the operator wants a consolidated view of all APs on a given controller providing the label, IP, status and number of connected stations.

Another use case could be, show the VMs status with average CPU and Memory connected to a given Host on its node page.

# Installation

## Install Angular App

* Create a directory called `js/node-extensions`.

* Copy `app.js` and `template.html` from this repository to the created directory.
 
## Edit node.jsp

At the beginig of the file when all the JavaScript libraries are imported, add the following entry:

```xml=
<jsp:param name="script" value='<script type="text/javascript" src="js/node-extensions/app.js"></script>' />
```

Find the place on which you want to load the extension and add the following piece of XML code:

```xml=
<div id="node-extensions" class="panel panel-default"
  <node-extensions node="${model.id}" oid="${model.node.sysObjectId}"/>
</div>
```

## Update the corresponding data collection settings

Inside `app.js`, each plugin shows which data should be collected in order to use the plugin. OpenNMS must be collecting the data in order to render the panel; otherwise nothing will be displayed on the node page.

# Add new implementations

Currently there are 3 implementations:

* Ruckus SmartZone Controllers.
* Ruckus ZoneDirector Controllers.
* Cisco WLC

Each implementation is a method of the Angular controller that receives the list of resources, and should populate the following local variables:

* `$scope.title`, with the title of the panel.
* `$scope.columns`, with an array of objects, where each object describe the column. Each column contains 2 attributes: `name` for the unique column identifier, and `label` for the human readable text you'll see on the UI.
* `$scope.rows`, with an array of objects, where each object contains the values for each column. That means, each row object contains as `keys`, the `name` of the column, and the actual value to display on the table.

Each resource object contains the string attributes defined on the respective data collection configuration, and offers an async method to retrieve a single value of a given metric for the chosen resource using the Measurements API.

# Execute local tests

```SHELL
npm install
npm test
```
