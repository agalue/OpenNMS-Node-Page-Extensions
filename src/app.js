/**
 * @author Alejandro Galue <agalue@opennms.org>
 */

'use strict';

angular.module('node-extensions', [])

/**
 * @ngdoc directive
 * @name nodeExtensions
 * @module node-extensions
 *
 * @description A directive to render a table with custom data.
 * It expects two attributes:
 * - id  : ID of the OpenNMS node instance
 * - oid : The systemObjectId of the OpenNMS node instance
 */
.directive('nodeExtensions', function() {
  return {
    restrict: 'E',
    scope: {
      nodeId: '@nodeid',
      sysObjectId: '@sysobjectid'
    },
    templateUrl: 'js/node-extensions/template.html',
    controller: 'NodeExtensionsCtrl'
  };
})

/**
 * @ngdoc controller
 * @name NodeExtensionsCtrl
 * @module node-extensions
 *
 * @requires $scope Angular local scope
 * @requires $http Angular service that facilitates communication with the remote HTTP servers
 * @requires $q Angular promise/deferred implementation
 *
 * @description The controller for managing node extensions
 */
.controller('NodeExtensionsCtrl', function($scope, $http, $q) {

  /**
   * @description The node ID (external parameter)
   * Obtained from the directive (named as 'id' on the HTML tag).
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#nodeId
   * @propertyOf NodeExtensionsCtrl
   * @returns {integer} The node ID
   */
  $scope.nodeId;

  /**
   * @description The system object ID (external parameter)
   * Obtained from the directive (named as 'oid' on the HTML tag).
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#sysObjectId
   * @propertyOf NodeExtensionsCtrl
   * @returns {string} The system object ID
   */
  $scope.sysObjectId;

  /**
   * @description The columns array.
   * Each element should be an object with the following keys:
   * - name: The column unique identifier
   * - label: The human readable description of the column
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#columns
   * @propertyOf NodeExtensionsCtrl
   * @returns {array} The columns (default: empty array)
   */
  $scope.columns = [];

  /**
   * @description The rows array.
   * Each element should be an object with a key equal to the name of each defined column from the columns array.
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#rows
   * @propertyOf NodeExtensionsCtrl
   * @returns {array} The rows (default: empty array)
   */
  $scope.rows = [];

  /**
   * @description The loading flag
   * Used to let the template know what should be rendered while loading data from the server.
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#loading
   * @propertyOf NodeExtensionsCtrl
   * @returns {boolean} The loading flag (default: true)
   */
  $scope.loading = true;

    /**
   * @description The plugin found flag
   * Used to let the template know that the panel should be rendered.
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#pluginFound
   * @propertyOf NodeExtensionsCtrl
   * @returns {boolean} The plugin found flag (default: false)
   */
  $scope.pluginFound = false;

  /**
   * @description The title
   * The title of the extension panel.
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#title
   * @propertyOf NodeExtensionsCtrl
   * @returns {string} The panel title (default: 'Extension Panel')
   */
  $scope.title = 'Extension Panel';

  /**
   * @description Requests the value of a metric from a given resource to the Measurements API and updates the chosen row.
   * This is an asynchronous operation, as it requires to make an HTTP call.
   *
   * @name NodeExtensionsCtrl:fetchMetricAndUpdateRow
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {object} resource The OpenNMS Resource object
   * @param {string} metric The name of the desired metric
   * @param {object} rowObj The row object to be updated on successful retrieval of the data
   * @param {string} rowField The name of row field to update
   */
  $scope.fetchMetricAndUpdateRow = function(resource, metric, rowObj, rowField) {
    console.debug('Getting value for metric ' + resource.id + '.' + metric);
    if (resource.rrdGraphAttributes[metric]) {
      var resourceId = encodeURIComponent(resource.id.replace('%3A',':'));
      $http.get('rest/measurements/' + resourceId + '/' + metric + '?start=-900000')
      .success(function(info) {
        var values = info.columns[0].values.reverse();
        for (var i=0; i<values.length; i++) {
          if (values[i] !== 'NaN') {
            console.debug('Got it: ' + values[i]);
            rowObj[rowField] = Math.ceil(values[i]); // Use the upward nearest integer.
            break;
          }
        }
      });
    } else {
      console.warn('The metric ' + metric + ' is not available for ' + resource.id);
    }
  };

  /**
   * @description Requests the value of a metric from a given resource to the Measurements API.
   * This is an asynchronous operation, as it requires to make an HTTP call.
   *
   * @name NodeExtensionsCtrl:fetchResources
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {string} resourceId The OpenNMS Resource ID
   * @returns {promise} A promise with an array of OpenNMS resource objects when successfully resolved.
   */ 
  $scope.fetchResources = function(resourceId) {
    var deferred = $q.defer();
    $http.get('rest/resources/fornode/' + resourceId)
      .success(function(data) {
        deferred.resolve(data.children.resource);
      })
      .error(function() {
        $scope.loading = false;
        deferred.reject();
      });
    return deferred.promise;
  };

  /**
   * @description Plugin Implementation Registration
   * If the provided sysObjectId matches the required criteria, a function is returned
   * with the plugin implementation.
   *
   * Each extension implementation will receive an array with the OpenNMS resources, and
   * it should populate $scope.title, $scope.columns, and $scope.rows.
   *
   * @name NodeExtensionsCtrl:getPluginImplementation
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @returns {function} A plugin implementation or undefined
   */ 
  $scope.getPluginImplementation = function() {
    if ($scope.sysObjectId.indexOf('.1.3.6.1.4.1.25053.3.1.5.') != -1) {
      console.log("Device with ID " + $scope.nodeId + " is a Ruckus ZD, loading plugin.");
      return $scope.pluginRuckusZoneDirectorData;
    } else if ($scope.sysObjectId.indexOf('.1.3.6.1.4.1.25053.3.1.11.') != -1) {
      console.log("Device with ID " + $scope.nodeId + " is a Ruckus SmartZone, loading plugin.");
      return $scope.pluginRuckusSmartZoneData;
    } else if (['.1.3.6.1.4.1.9.1.2170','.1.3.6.1.4.1.9.1.2370','.1.3.6.1.4.1.9.1.2371','.1.3.6.1.4.1.9.1.1279'].includes($scope.sysObjectId)) {
      console.log("Device with ID " + $scope.nodeId + " is a Cisco WLC, loading plugin.");
      return $scope.pluginCiscoWlcData;
    }
    return undefined;
  };

  /**
   * @description Plugin implementation for the Zone Director devices.
   * This method should populate the 'columns', 'rows' and the 'title' on the $scope.
   *
   * Requires the following metrics for the SNMP Collector in OpenNMS:
   * 
   * <resourceType name="ruckusZDWLANAPEntry" label="Ruckus ZoneDirector WLAN AP" resourceLabel="${rzdAPDescripion}">
   *    <persistenceSelectorStrategy class="org.opennms.netmgt.collection.support.PersistAllSelectorStrategy"/>
   *    <storageStrategy class="org.opennms.netmgt.collection.support.IndexStorageStrategy"/>
   * </resourceType>
   * 
   * <!-- From RUCKUS-ZD-WLAN-MIB; ZoneDirector Devices -->
   * <group name="ruckusZDWLANAPTable" ifType="all">
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.2.2.1.1.2.1.1.2"  instance="ruckusZDWLANAPEntry" alias="rzdAPDescripion" type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.2.2.1.1.2.1.1.3"  instance="ruckusZDWLANAPEntry" alias="rzdAPStatus"     type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.2.2.1.1.2.1.1.10" instance="ruckusZDWLANAPEntry" alias="rzdAPIPAddress"  type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.2.2.1.1.2.1.1.15" instance="ruckusZDWLANAPEntry" alias="rzdAPNumSta"     type="integer"/>
   * </group>
   *
   * @name NodeExtensionsCtrl:pluginRuckusZoneDirectorData
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {array} resources The list of OpenNMS Resources from the Resources ReST API
   */
  $scope.pluginRuckusZoneDirectorData = function(resources) {
    $scope.title = 'Ruckus ZoneDirector Access Points';
    $scope.columns = [
      { name: 'description', label: 'Description' },
      { name: 'ipAddress',   label: 'IP Address' },
      { name: 'numStations', label: '# Stations' },
      { name: 'status',      label: 'Status' }
    ];
    for (var r of resources) {
      if (r.id.match(/ruckusZDWLANAPEntry/)) {
        var row = {
          description: r.stringPropertyAttributes.rzdAPDescripion,
          ipAddress: r.stringPropertyAttributes.rzdAPIPAddress,
          numStations: '...', // Will be replaced by fetchMetricAndUpdateRow asynchronously
          status: 'Unknown' // Default value
        };
        switch (r.stringPropertyAttributes.rzdAPStatus) {
          case '0': row.status = 'Disconnected'; break;
          case '1': row.status = 'Connected'; break;
          case '2': row.status = 'Approval Pending'; break;
          case '3': row.status = 'Upgrading Firmware'; break;
          case '4': row.status = 'Provisioning'; break;
        }
        $scope.rows.push(row);
        $scope.fetchMetricAndUpdateRow(r, 'rzdAPNumSta', row, 'numStations');
      }
    }
  };

  /**
   * @description Plugin implementation for the Ruckus Smart Zone devices.
   * This method should populate the 'columns', 'rows' and the 'title' on the $scope.
   *
   * Requires the following metrics for the SNMP Collector in OpenNMS:
   * 
   * <resourceType name="ruckusSZAPEntry" label="Ruckus SmartZone AP" resourceLabel="${rszAPName}">
   *    <persistenceSelectorStrategy class="org.opennms.netmgt.collection.support.PersistAllSelectorStrategy"/>
   *    <storageStrategy class="org.opennms.netmgt.collection.support.IndexStorageStrategy"/>
   * </resourceType>
   * 
   * <!-- From RUCKUS-SZ-WLAN-MIB; SmartZone Devices -->
   * <group name="ruckusSZAPTable" ifType="all">
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.4.2.1.1.2.2.1.5"  instance="ruckusSZAPEntry" alias="rszAPName"       type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.4.2.1.1.2.2.1.10" instance="ruckusSZAPEntry" alias="rszAPIp"         type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.4.2.1.1.2.2.1.15" instance="ruckusSZAPEntry" alias="rszAPNumSta"     type="integer"/>
   *    <mibObj oid=".1.3.6.1.4.1.25053.1.4.2.1.1.2.2.1.16" instance="ruckusSZAPEntry" alias="rszAPConnStatus" type="string"/>
   * </group>
   *
   * @name NodeExtensionsCtrl:pluginRuckusSmartZoneData
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {array} resources The list of OpenNMS Resources from the Resources ReST API
   */
  $scope.pluginRuckusSmartZoneData = function(resources) {
    $scope.title = 'Ruckus SmartZone Access Points';
    $scope.columns = [
      { name: 'description', label: 'Description' },
      { name: 'ipAddress',   label: 'IP Address' },
      { name: 'numStations', label: '# Stations' },
      { name: 'status',      label: 'Status' }
    ];
    for (var r of resources) {
      if (r.id.match(/ruckusSZAPEntry/)) {
        var row = {
          description: r.stringPropertyAttributes.rszAPName,
          ipAddress: r.stringPropertyAttributes.rszAPIp,
          numStations: '...', // Will be replaced by fetchMetricAndUpdateRow asynchronously
          status: r.stringPropertyAttributes.rszAPConnStatus
        };
        $scope.rows.push(row);
        $scope.fetchMetricAndUpdateRow(r, 'rszAPNumSta', row, 'numStations');
      }
    }
  };

  /**
   * @description Plugin implementation for the Cisco WLC devices.
   * This method should populate the 'columns', 'rows' and the 'title' on the $scope.
   *
   * Requires the following metrics for the SNMP Collector in OpenNMS:
   * 
   * <resourceType name="ciscoAPMacAddress" label="Cisco WLC AP" resourceLabel="${cLApName}">
   *    <persistenceSelectorStrategy class="org.opennms.netmgt.collection.support.PersistAllSelectorStrategy"/>
   *    <storageStrategy class="org.opennms.netmgt.collection.support.IndexStorageStrategy"/>
   * </resourceType>
   * 
   * <!-- From CISCO-LWAPP-AP-MIB. cLApTable is indexed by cLApSysMacAddress which has a type of MacAddress -->
   * <group name="cLApTable" ifType="all">
   *    <mibObj oid=".1.3.6.1.4.1.9.9.513.1.1.1.1.5"  instance="ciscoAPMacAddress" alias="cLApName"          type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.9.9.513.1.1.1.1.54" instance="ciscoAPMacAddress" alias="cLApAssocCliCount" type="integer"/>
   * </group>
   * <!-- From AIRESPACE-WIRELESS-MIB. bsnAPTable is indexed by bsnAPDot3MacAddress which has a type of MacAddress -->
   * <group name="bsnAPTable" ifType="all">
   *    <mibObj oid=".1.3.6.1.4.1.14179.2.2.1.1.3"  instance="ciscoAPMacAddress" alias="bsnAPName"       type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.14179.2.2.1.1.6"  instance="ciscoAPMacAddress" alias="bsnAPOperStatus" type="string"/>
   *    <mibObj oid=".1.3.6.1.4.1.14179.2.2.1.1.19" instance="ciscoAPMacAddress" alias="bsnApIpAddress"  type="string"/>
   * </group>
   *
   * @name NodeExtensionsCtrl:pluginCiscoWlcData
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {array} resources The list of OpenNMS Resources from the Resources ReST API
   */
  $scope.pluginCiscoWlcData = function(resources) {
    $scope.title = 'Cisco WLC Access Points';
    $scope.columns = [
      { name: 'description', label: 'Description' },
      { name: 'ipAddress',   label: 'IP Address' },
      { name: 'numStations', label: '# Stations' },
      { name: 'status',      label: 'Status' }
    ];
    for (var r of resources) {
      if (r.id.match(/ciscoAPMacAddress/)) {
        var row = {
          description: r.stringPropertyAttributes.bsnAPName,
          ipAddress: r.stringPropertyAttributes.bsnApIpAddress,
          numStations: '...', // Will be replaced by fetchMetricAndUpdateRow asynchronously
          status: 'Unknown' // Default value
        };
        switch (r.stringPropertyAttributes.bsnAPOperStatus) {
          case '1': row.status = 'Associated'; break;
          case '2': row.status = 'Disassociating'; break;
          case '3': row.status = 'Downloading'; break;
        }
        $scope.rows.push(row);
        $scope.fetchMetricAndUpdateRow(r, 'cLApAssocCliCount', row, 'numStations');
      }
    }
  };

  /**
   * The following code is executed as soon as the controller is loaded.
   *
   * It will try to obtain a plugin implementation for the provided sysObjectId.
   * When this is the case, the list of resources is obtained thrugh ReST, and then
   * the plygin is executed.
   *
   * Each extension implementation will receive an array with the OpenNMS resources, and
   * it should populate $scope.title, $scope.columns, and $scope.rows.
   */
  console.debug('Getting plugin implementation...');
  var plugin = $scope.getPluginImplementation();
  if (plugin) {
    console.debug('Plugin found, getting data...');
    $scope.fetchResources($scope.nodeId).then(function(resources) {
      plugin(resources);
      $scope.loading = false;
      $scope.pluginFound = true;
    });
  } else {
    console.debug('No plugins were found...');
    $scope.loading = false;
  }
});

// Bootstrap to a an element with ID 'node-extensions'

angular.element(document).ready(function () {
  var el = document.getElementById('node-extensions');
  angular.bootstrap(angular.element(el), ['node-extensions']);
});
