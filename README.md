[![CircleCI](https://circleci.com/gh/agalue/OpenNMS-Node-Page-Extensions.svg?style=svg)](https://circleci.com/gh/agalue/OpenNMS-Node-Page-Extensions)

# Node Page Extensions

The idea is to be able to show custom tabular data based on collected performance metrics from certain devices into the node page.

A typical use case would be show additional information for those nodes that serve as a container of other devices.

An example would be Wireless Controller that manage multiple Access Points. In this scenario, the operator can have a consolidated view of all APs on a given controller providing its label, IP, status and number of connected stations.

Another use case could be, show the VMs status with average CPU and Memory connected to a given Host device (like ESX on a VMWare world).

# Installation

## Automatic procedure

From the OpenNMS machine:

```shell
sudo yum install -y -q git
git clone https://github.com/agalue/OpenNMS-Node-Page-Extensions.git
cd OpenNMS-Node-Page-Extensions
sudo sh install.sh
```

## Manual procedure

### Install the Angular App

* Create a directory called `$OPENNMS_HOME/jetty-webapps/opennms/js/node-extensions` at the OpenNMS server.

* Copy `src/app.js` and `src/template.html` from this repository to the created directory at the OpenNMS server.

The above is valid for Meridian 2016, Meridian 2017 and Horizon 21.x or older. For Horizon 22 (and the upcoming Meridian 2018), the `js` directory doesn't exist, but it can be manually created, as the JavaScript applications are distributted differently in this version.

### Edit node.jsp

The `node.jsp` file is located at the `$OPENNMS_HOME/jetty-webapps/opennms/includes/` directory.

Please make a backup of the file to be able to restore its original state, in case something wrong happens.

At the beginig of the file when all the JavaScript libraries are imported inside the `include` statement associated with the `bootstrap.jsp` declaration, add the following entry:

```html
<jsp:param name="script" value='<script type="text/javascript" src="js/node-extensions/app.js"></script>' />
```

The above is valid for Meridian 2016, Meridian 2017 and Horizon 21.x or older. For Horizon 22 (and the upcoming Meridian 2018), there are no `script` entries for the `bootstrap.jsp`, but it can be added without issues, although this feature is deprecated (make sure it is the last entry). Future versions of OpenNMS might require a different procedure.

Find the place on which you want to load the extension and add the following piece of XML code:

```html
<div id="node-extensions">
  <node-extensions nodeId="${model.id}" sysObjectId="${model.node.sysObjectId}"/>
</div>
```

The outer div is the container where the Angular application will be bootstrapped. The ID has to be `node-extensions`, in order to render the tag with the same name inside of it.

Note that the custom tag (ie. an Angular directive), expects to receive 2 parameters: the ID of the node, and the system Object ID. On the `node.jsp`, these two values are available as shown on the above HTML section.

This custom tag renders a table widget with the data only when there is a plugin implementation; otherwise it does nothing.

### Update the corresponding data collection settings

Inside `sc/app.js`, each plugin shows which data should be collected in order to use the plugin. OpenNMS must be collecting the data in order to render the panel; otherwise nothing will be displayed on the node page.

To simplify the implementation process, the `resources` directory contains a suggested configuration not only to cover the needs of this application, but also to collect some basic statistics from the involved devices.

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

Once the plugin implementation exist, it should be registered inside `$scope.getPluginImplementation` using on some criteria based on the `sysObjectId`.

## Implementation Example

Let's say the users would like to see a panel on the node page that shows the amount of collected metrics per resource-type. The first thing to do is add the plugin implementation:

```javascript
$scope.pluginResourceCount = function(resources) {
  $scope.title = 'Resource Statistics';
  $scope.columns = [
    { name: 'type',  label: 'Resource Type' },
    { name: 'count', label: '# of Metrics' }
  ];
  var stats = {};
  for (var r of resources) {
    if (stats[r.typeLabel] === undefined) stats[r.typeLabel] = 0;
    stats[r.typeLabel] += Object.keys(r.rrdGraphAttributes).length;
  }
  for (var k in stats) {
    $scope.rows.push({ type: k, count: stats[k] });
  }
};
```

Then, the next step is register the above plugin inside `getPluginImplementation`, to make sure it will be rendered when needed.

# Execute local tests

[CircleCI](https://circleci.com/gh/agalue/OpenNMS-Node-Page-Extensions) is testing this repository, but here is how to do it on your own:

```shell
npm install
npm test
```
