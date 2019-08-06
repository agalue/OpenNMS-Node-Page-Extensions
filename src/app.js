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
   * @description Set to true to use bulk requests when retrieving data using the Measurements API
   *              Otherwise, a single request per resource/metric combination will be executed.
   *
   * @ngdoc property
   * @name NodeExtensionsCtrl#useBulk
   * @propertyOf NodeExtensionsCtrl
   * @returns {boolean} The use bulk flag (default: true)
   */
  $scope.useBulk;
  if ($scope.useBulk === undefined) $scope.useBulk = true;

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
   * @description Updates a row
   * Appends a numeric value to a specific field from a specifc row.
   *
   * @name NodeExtensionsCtrl:updateRow
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {number} rowIndex The numeric index of the row to update
   * @param {string} rowField The name of the row field to update
   * @param {number} value The value to append
   */
  $scope.updateRow = function(rowIndex, rowField, value) {
    if ($scope.rows[rowIndex][rowField] === '...') {
      $scope.rows[rowIndex][rowField] = 0;
    }
    $scope.rows[rowIndex][rowField] += value;
    console.debug('Updated field ' + rowField + ' from row number ' + rowIndex + ' with value ' + $scope.rows[rowIndex][rowField]);
  };

  /**
   * @description Requests the value of a metric from a given resource to the Measurements API and updates the chosen row.
   * This is an asynchronous operation, as it requires to make an HTTP call.
   *
   * @name NodeExtensionsCtrl:fetchMetricAndUpdateRow
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {object} resource The OpenNMS Resource object
   * @param {string} metric The name of the desired metric
   * @param {number} rowIndex The index of the row to be updated on successful retrieval of the data
   * @param {string} rowField The name of row field to update
   */
  $scope.fetchMetricAndUpdateRow = function(resource, metric, rowIndex, rowField) {
    console.debug('Getting value for metric ' + resource.id + '.' + metric);
    if (resource.rrdGraphAttributes[metric]) {
      var resourceId = encodeURIComponent(resource.id.replace('%3A',':'));
      $http.get('rest/measurements/' + resourceId + '/' + metric + '?start=-900000')
      .success(function(info) {
        var values = info.columns[0].values.reverse();
        $scope.updateRow(rowIndex, rowField, $scope.getLatestValue(values));
      });
    } else {
      console.warn('The metric ' + metric + ' is not available for ' + resource.id);
    }
  };

  /**
   * @description Requests the values of all the metrics involved at once (bulk requestr from Measurements API and updates the table.
   * This is an asynchronous operation, as it requires to make an HTTP call.
   *
   * Each element of the dataArray array contains:
   * - resource: The resource Id
   * - metric: The metric Id
   * - row: The rowIndex of the column to update
   *
   * @name NodeExtensionsCtrl:fetchBulkMetricAndUpdateRow
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {array} dataArray The data array
   * @param {string} rowField The name of the row field to update
   */
   $scope.fetchBulkMetricAndUpdateRow = function(dataArray, rowField) {
    var step = 300000;
    var endTime = new Date().getTime();
    endTime = endTime - endTime % step + step;
    var measurements = {
      start: endTime - 900000,
      end: endTime,
      step: step,
      maxrows: 5,
      source: []
    };
    for (var i=0; i<dataArray.length; i++) {
      var metric = dataArray[i].metric;
      var resource = dataArray[i].resource;
      var rowIndex = dataArray[i].row;
      if (resource.rrdGraphAttributes[metric]) {
        measurements.source.push({
          aggregation: 'AVERAGE',
          attribute: metric,
          label: rowIndex.toString(),
          resourceId: resource.id,
          transient: false
        });
      } else {
        console.warn('The metric ' + metric + ' is not available for ' + resource.id);
      }
    }
    console.debug('Getting value for ' + measurements.source.length + ' metrics...');
    $http.post('rest/measurements', measurements)
      .success(function(data) {
        for (var i=0; i < data.columns.length; i++) {
          var values = data.columns[i].values.reverse();
          var rowIndex = parseInt(data.labels[i]);
          $scope.updateRow(rowIndex, rowField, $scope.getLatestValue(values));
        }
      });
  };

  /**
   * @description Updates the table using the Measurements API.
   *
   * Each element of the dataArray array contains:
   * - resource: The resource Id
   * - metric: The metric Id
   * - row: The rowIndex of the column to update
   *
   * @name NodeExtensionsCtrl:updateTable
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {array} dataArray The data array
   * @param {string} rowField The name of the row field to update
   */
  $scope.updateTable = function(dataArray, rowField) {
    if (dataArray == undefined || dataArray.length == 0) {
      console.warn('updateTable: dataArray cannot be empty; skipping...');
    }
    if ($scope.useBulk) {
      $scope.fetchBulkMetricAndUpdateRow(dataArray, rowField);
    } else {
      for (var i=0; i<dataArray.length; i++) {
        $scope.fetchMetricAndUpdateRow(dataArray[i].resource, dataArray[i].metric, dataArray[i].row, rowField);
      }
    }
  };

  /**
   * @description Gets the last value from an array that is not NaN.
   *
   * @name NodeExtensionsCtrl:getLatestValue
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {array} values The values array.
   * @returns {value} The latest value.
   */
  $scope.getLatestValue = function(values) {
    for (var i=0; i<values.length; i++) {
      if (values[i] !== 'NaN') {
        console.debug('Got it: ' + values[i]);
        return Math.ceil(values[i]); // Use the upward nearest integer.
      }
    }
    return null;
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
    } else if ($scope.sysObjectId.indexOf('.1.3.6.1.4.1.25053.3.1.10') != -1) {
      console.log("Device with ID " + $scope.nodeId + " is a Ruckus SCG, loading plugin.");
      return $scope.pluginRuckusSCGData;
    } else if (['.1.3.6.1.4.1.9.1.2170','.1.3.6.1.4.1.9.1.2370','.1.3.6.1.4.1.9.1.2371','.1.3.6.1.4.1.9.1.1279'].includes($scope.sysObjectId)) {
      console.log("Device with ID " + $scope.nodeId + " is a Cisco WLC, loading plugin.");
      return $scope.pluginCiscoWlcData;
    }
    return undefined;
  };

  /**
   * @description Plugin implementation for the Zone Director devices.
   * This method should populate the 'columns', 'rows' and the 'title' on the $scope.
   * For this purpose an array has to be passed to the updateTable method, where each element is an object with 3 elements:
   * - resource (the resource object from the OpenNMS resources end-point)
   * - metric (the metricName)
   * - row (the index of the row to be updated)
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
    var dataArray = [];
    for (var r of resources) {
      if (r.id.match(/ruckusZDWLANAPEntry/)) {
        var row = {
          description: r.stringPropertyAttributes.rzdAPDescripion,
          ipAddress: r.stringPropertyAttributes.rzdAPIPAddress,
          numStations: '...', // Will be replaced asynchronously
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
        dataArray.push({
          resource: r,
          metric: 'rzdAPNumSta',
          row: $scope.rows.length - 1
        });
      }
    }
    $scope.updateTable(dataArray, 'numStations');
  };

  /**
   * @description Plugin implementation for the Ruckus Smart Zone devices.
   * This method should populate the 'columns', 'rows' and the 'title' on the $scope.
   * For this purpose an array has to be passed to the updateTable method, where each element is an object with 3 elements:
   * - resource (the resource object from the OpenNMS resources end-point)
   * - metric (the metricName)
   * - row (the index of the row to be updated)
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
    var dataArray = [];
    for (var r of resources) {
      if (r.id.match(/ruckusSZAPEntry/)) {
        var row = {
          description: r.stringPropertyAttributes.rszAPName,
          ipAddress: r.stringPropertyAttributes.rszAPIp,
          numStations: '...', // Will be replaced asynchronously
          status: r.stringPropertyAttributes.rszAPConnStatus
        };
        $scope.rows.push(row);
        dataArray.push({
          resource: r,
          metric: 'rszAPNumSta',
          row: $scope.rows.length - 1
        });
      }
    }
    $scope.updateTable(dataArray, 'numStations');
  };

  /**
   * @description Plugin implementation for the SCG devices.
   * This method should populate the 'columns', 'rows' and the 'title' on the $scope.
   * For this purpose an array has to be passed to the updateTable method, where each element is an object with 3 elements:
   * - resource (the resource object from the OpenNMS resources end-point)
   * - metric (the metricName)
   * - row (the index of the row to be updated)
   *
   * Requires the following metrics for the SNMP Collector in OpenNMS:
   * 
   * <resourceType name="ruckusSCGAPEntry" label="Ruckus SCG AP" resourceLabel="${rscgAPName}">
   *   <persistenceSelectorStrategy class="org.opennms.netmgt.collection.support.PersistAllSelectorStrategy"/>
   *   <storageStrategy class="org.opennms.netmgt.collection.support.IndexStorageStrategy"/>
   * </resourceType>
   * 
   * <!-- From RUCKUS-SCG-WLAN-MIB; SCG Devices -->
   * <group name="ruckusSCGAPTable" ifType="all">
   *   <mibObj oid=".1.3.6.1.4.1.25053.1.3.2.1.1.2.2.1.5"  instance="ruckusSCGAPEntry" alias="rscgAPName"       type="string"/>
   *   <mibObj oid=".1.3.6.1.4.1.25053.1.3.2.1.1.2.2.1.10" instance="ruckusSCGAPEntry" alias="rscgAPIp"         type="string"/>
   *   <mibObj oid=".1.3.6.1.4.1.25053.1.3.2.1.1.2.2.1.15" instance="ruckusSCGAPEntry" alias="rscgAPNumSta"     type="integer"/>
   *   <mibObj oid=".1.3.6.1.4.1.25053.1.3.2.1.1.2.2.1.16" instance="ruckusSCGAPEntry" alias="rscgAPConnStatus" type="string"/>
   * </group>
   *
   * @name NodeExtensionsCtrl:pluginRuckusSCGData
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {array} resources The list of OpenNMS Resources from the Resources ReST API
   */
  $scope.pluginRuckusSCGData = function(resources) {
    $scope.title = 'Ruckus SCG Access Points';
    $scope.columns = [
      { name: 'description', label: 'Description' },
      { name: 'ipAddress',   label: 'IP Address' },
      { name: 'numStations', label: '# Stations' },
      { name: 'status',      label: 'Status' }
    ];
    var dataArray = [];
    for (var r of resources) {
      if (r.id.match(/ruckusSCGAPEntry/)) {
        var row = {
          description: r.stringPropertyAttributes.rscgAPName,
          ipAddress: r.stringPropertyAttributes.rscgAPIp,
          numStations: '...', // Will be replaced asynchronously
          status: r.stringPropertyAttributes.rscgAPConnStatus
        };
        $scope.rows.push(row);
        dataArray.push({
          resource: r,
          metric: 'rscgAPNumSta',
          row: $scope.rows.length - 1
        });
      }
    }
    $scope.updateTable(dataArray, 'numStations');
  };

  /**
   * @description Plugin implementation for the Cisco WLC devices.
   * This method should populate the 'columns', 'rows' and the 'title' on the $scope.
   * For this purpose an array has to be passed to the updateTable method, where each element is an object with 3 elements:
   * - resource (the resource object from the OpenNMS resources end-point)
   * - metric (the metricName)
   * - row (the index of the row to be updated)
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
    var dataArray = [];
    for (var r of resources) {
      if (r.id.match(/ciscoAPMacAddress/)) {
        var row = {
          description: r.stringPropertyAttributes.bsnAPName,
          ipAddress: r.stringPropertyAttributes.bsnApIpAddress,
          numStations: '...', // Will be replaced asynchronously
          status: 'Unknown' // Default value
        };
        switch (r.stringPropertyAttributes.bsnAPOperStatus) {
          case '1': row.status = 'Associated'; break;
          case '2': row.status = 'Disassociating'; break;
          case '3': row.status = 'Downloading'; break;
        }
        $scope.rows.push(row);
        dataArray.push({
          resource: r,
          metric: 'cLApAssocCliCount',
          row: $scope.rows.length - 1
        });
      }
    }
    $scope.updateTable(dataArray, 'numStations');
  };

  /**
   * @description Plugin implementation for Aruba devices.
   * This method should populate the 'columns', 'rows' and the 'title' on the $scope.
   * For this purpose an array has to be passed to the updateTable method, where each element is an object with 3 elements:
   * - resource (the resource object from the OpenNMS resources end-point)
   * - metric (the metricName)
   * - row (the index of the row to be updated)
   *
   * Requires the following metrics for the SNMP Collector in OpenNMS:
   * 
   * <resourceType name="wlsxWlanAPEntry" label="Aruba AP" resourceLabel="AP ${wlanAPName} (${wlanAPMacAddress})">
   *   <persistenceSelectorStrategy class="org.opennms.netmgt.collection.support.PersistAllSelectorStrategy"/>
   *   <storageStrategy class="org.opennms.netmgt.collection.support.IndexStorageStrategy"/>
   * </resourceType>
   * <resourceType name="wlsxWlanRadioEntry" label="Aruba AP/Radio" resourceLabel="AP ${wlAPRadioAPName} Radio #${wlAPRadioNumber}">
   *   <persistenceSelectorStrategy class="org.opennms.netmgt.collection.support.PersistAllSelectorStrategy"/>
   *   <storageStrategy class="org.opennms.netmgt.collection.support.IndexStorageStrategy"/>
   * </resourceType>
   * 
   * <!-- From WLSX-WLAN-MIB -->
   * <group name="wlsxWlanAPTable" ifType="all">
   *   <mibObj oid=".1.3.6.1.4.1.14823.2.2.1.5.2.1.4.1.1" instance="wlsxWlanAPEntry" alias="wlanAPMacAddress" type="string"/>
   *   <mibObj oid=".1.3.6.1.4.1.14823.2.2.1.5.2.1.4.1.2" instance="wlsxWlanAPEntry" alias="wlanAPIpAddress" type="string"/>
   *   <mibObj oid=".1.3.6.1.4.1.14823.2.2.1.5.2.1.4.1.3" instance="wlsxWlanAPEntry" alias="wlanAPName" type="string"/>
   *   <mibObj oid=".1.3.6.1.4.1.14823.2.2.1.5.2.1.4.1.19" instance="wlsxWlanAPEntry" alias="wlanAPStatus" type="string"/>
   * </group>
   * <group name="wlsxWlanRadioTable" ifType="all">
   *   <mibObj oid=".1.3.6.1.4.1.14823.2.2.1.5.2.1.5.1.1"  instance="wlsxWlanRadioEntry" alias="wlAPRadioNumber" type="string"/>
   *   <mibObj oid=".1.3.6.1.4.1.14823.2.2.1.5.2.1.5.1.7"  instance="wlsxWlanRadioEntry" alias="wlAPRadioNumSta" type="integer"/>
   *   <mibObj oid=".1.3.6.1.4.1.14823.2.2.1.5.2.1.5.1.16" instance="wlsxWlanRadioEntry" alias="wlAPRadioAPName" type="string"/>
   *   <property instance="wlsxWlanRadioEntry" alias="wlanAPIpAddress">
   *     <parameter key="source-type" value="wlsxWlanAPEntry" />
   *     <parameter key="source-alias" value="wlanAPIpAddress" />
   *     <parameter key="index-pattern" value="^(.+)\.\d+$" />
   *   </property>
   *   <property instance="wlsxWlanRadioEntry" alias="wlanAPStatus">
   *     <parameter key="source-type" value="wlsxWlanAPEntry" />
   *     <parameter key="source-alias" value="wlanAPStatus" />
   *     <parameter key="index-pattern" value="^(.+)\.\d+$" />
   *   </property>
   * </group>
   * 
   * @name NodeExtensionsCtrl:pluginArubaData
   * @ngdoc method
   * @methodOf NodeExtensionsCtrl
   * @param {array} resources The list of OpenNMS Resources from the Resources ReST API
   */
  $scope.pluginArubaData = function(resources) {
    $scope.title = 'Aruba Access Points';
    $scope.columns = [
      { name: 'description', label: 'Description' },
      { name: 'ipAddress',   label: 'IP Address' },
      { name: 'numStations', label: '# Stations' },
      { name: 'status',      label: 'Status' }
    ];
    var dataArray = [];
    for (var r of resources) {
      if (r.id.match(/wlsxWlanRadioEntry/)) {
        var row = {
          description: r.stringPropertyAttributes.wlAPRadioAPName,
          ipAddress: r.stringPropertyAttributes.wlanAPIpAddress,
          numStations: '...', // Will be replaced asynchronously
          status: 'Unknown' // Default value
        };
        switch (r.stringPropertyAttributes.wlanAPStatus) {
          case '1': row.status = 'Up'; break;
          case '2': row.status = 'Down'; break;
        }
        var foundIndex = -1;
        for (var i = 0; i < $scope.rows.length; i++) {
          if ($scope.rows[i].description == row.description) {
            foundIndex = i;
            break;
          }
        }
        if (foundIndex < 0) {
          $scope.rows.push(row);
          foundIndex = $scope.rows.length - 1;
        }
        dataArray.push({
          resource: r,
          metric: 'wlAPRadioNumSta',
          row: foundIndex
        });
      }
    }
    $scope.updateTable(dataArray, 'numStations');
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
  $scope.loading = true;
  var plugin = $scope.getPluginImplementation();
  if (plugin) {
    $scope.pluginFound = true;
    console.debug('Plugin found, getting data...');
    $scope.fetchResources($scope.nodeId).then(function(resources) {
      plugin(resources);
      $scope.loading = false;
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
