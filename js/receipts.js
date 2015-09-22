"use strict";
var app = angular.module('facturi.receipts', ['ngRoute', 'ngResource']);

app.config(['$routeProvider', function($routeProvider) {
	$routeProvider
	.when('/receipts', {
		templateUrl : 'templates/receipts/index.html',
		controller : 'ReceiptsController'
	}).when('/receipts/show/:id', {
		templateUrl : 'templates/receipts/get.html',
		controller : 'GetReceiptController'
	}).when('/receipts/add', {
		templateUrl : 'templates/receipts/add.html',
		controller : 'AddReceiptController'
	}).when('/receipts/edit/:id', {
		templateUrl : 'templates/receipts/edit.html',
		controller : 'EditReceiptController'
	});
}]);

app.factory('Receipt', function($resource) {
	var processResource = function (resource) {
		if (resource.date)
			resource.date = new Date(resource.date);
		
		return resource;
	};
	var responseInterceptor = function (response) {
		var resource = response.resource;
		
		if (angular.isArray(resource)) {
			for (var i = 0; i < resource.length; i++)
				processResource(resource[i]);
		} else {
			processResource(resource);
		}
		
		return resource;
	};
	
	var requestTransformer = function (data, headersGetter) {
		var resource = angular.copy(data);
		
		if (resource.date)
			resource.date = resource.date.getFullYear()+'-'+(resource.date.getMonth()+1)+'-'+resource.date.getDate();
		
		return angular.toJson(resource);
	};
	
	return $resource('/api/receipts/:_id', {
		_id : "@_id"
	}, {
		get : {
			method  : 'GET',
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			interceptor: { response: responseInterceptor }
		}, insert : {
			method  : 'POST',
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			interceptor: { response: responseInterceptor },
			transformRequest : requestTransformer
		}, save : {
			method  : 'PUT',
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			interceptor: { response: responseInterceptor },
			transformRequest : requestTransformer
		}, remove : {
			method  : 'DELETE',
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			interceptor: { response: responseInterceptor }
		}, query : {
			method  : 'GET',
			isArray : true,
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			interceptor: { response: responseInterceptor }
		}, queryInvoice : {
			url     : '/api/invoices/:_id/receipts',
			method  : 'GET',
			isArray : true,
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			interceptor: { response: responseInterceptor }
		}
	});
});

app.controller('ReceiptsController', ['$scope', '$location', 'Receipt', function($scope, $location, Receipt) {
	$scope.receipts = Receipt.query({ sort : 'code,number' });
	$scope.remove = function (id) {
		if (!confirm("Are you sure you want to delete the receipt?"))
			return;
		
		Receipt.remove({ _id : id }, function (r) {
			for (var i = 0; i < $scope.receipts.length; i++)
				if ($scope.receipts[i]._id == id) {
					$scope.receipts.splice(i, 1);
					break;
				}
		});
	};
}]);

app.controller('GetReceiptController', ['$scope', '$location', '$routeParams', 'Receipt', function($scope, $location, $routeParams, Receipt) {
	$scope.receipt = Receipt.get({_id : $routeParams.id});
}]);

app.controller('AddReceiptController', ['$scope', '$location', '$routeParams', 'Receipt', 'Invoice', 'Client', function($scope, $location, $routeParams, Receipt, Invoice, Client) {
	var today  = new Date();
	today.setHours(0, 0, 0, 0);
	$scope.date = new Date(today.getTime());
	Receipt.query({ sort : '-created_at', limit : 1 }, function (result) {
		if (result && result.length > 0) {
			var receipt = result[0];
			if (!$scope.code)
				$scope.code = receipt.code;
			if (!$scope.number)
				$scope.number = parseInt(receipt.number) + 1;
		}
	});
	
	$scope.client = {};
	$scope.clients = Client.query({}, function (clients) {
		if ($routeParams.client_id) {
			clients.forEach(function (client) {
				if (client._id == $routeParams.client_id)
					$scope.source_client = client;
			});
		}
		$scope.select_client();
	});
	$scope.invoices = [];
	$scope.all_invoices = Invoice.query({ sort : '-created_at' }, function (invoices) {
		if (!invoices)
			return;
		
		$scope.invoices = [];
		if ($scope.source_client) {
			invoices.forEach(function (invoice) {
				if (invoice.client._id == $scope.source_client._id)
					$scope.invoices.push(invoice);
			});
		}
		
		if ($routeParams.invoice_id) {
			invoices.forEach(function (invoice) {
				if (invoice._id == $routeParams.invoice_id)
					$scope.source_invoice = invoice;
			});
			$scope.select_invoice();
		}
	});
	$scope.select_client = function () {
		if ($scope.source_client) {
			$('.client-details').hide();
			$('.edit-client-info').show();
			$scope.client._id          = $scope.source_client._id;
			$scope.client.name         = $scope.source_client.name;
			$scope.client.cif          = $scope.source_client.cif;
			$scope.client.address      = $scope.source_client.address;
			$scope.client.city         = $scope.source_client.city;
			$scope.client.county       = $scope.source_client.county;
			$scope.client.country      = $scope.source_client.country;
			$scope.invoices = [];
			$scope.all_invoices.forEach(function (invoice) {
				if (invoice.client._id == $scope.source_client._id)
					$scope.invoices.push(invoice);
			});
		} else {
			$scope.client = {};
			$scope.invoices = [];
			$('.client-details').show();
			$('.edit-client-info').hide();
		}
	};
	$scope.select_client();
	$scope.select_invoice = function () {
		if ($scope.source_invoice) {
			$scope.invoice_id = $scope.source_invoice._id;
			$scope.value = $scope.source_invoice._total();
			var date = $scope.source_invoice.date.getFullYear()+'-'+($scope.source_invoice.date.getMonth()+1)+'-'+$scope.source_invoice.date.getDate();
			$scope.description = 'Contravaloarea facturii ' + $scope.source_invoice.code + ' ' + $scope.source_invoice.number + ' din data de ' + date;
		} else {
			$scope.invoice_id = null;
			$scope.value = '';
			$scope.description = '';
		}
	};
	$scope.submit = function () {
		var receipt = new Receipt({
			client      : $scope.client,
			invoice_id  : $scope.invoice_id,
			code        : $scope.code,
			number      : $scope.number,
			date        : $scope.date,
			value       : $scope.value,
			description : $scope.description
		});
		receipt.$insert(function (res) {
			if (res.$resolved !== true)
				return;
			
			$location.path('/receipts');
		}, function (err) {
			console.log(err.data);
			alert(err.data.message);
		});
	};
}]);

app.controller('EditReceiptController', ['$scope', '$location', '$routeParams', 'Receipt', 'Invoice', 'Client', function($scope, $location, $routeParams, Receipt, Invoice, Client) {
	$scope.receipt = Receipt.get({_id : $routeParams.id}, function (receipt) {
		$scope.clients = Client.query({}, function (clients) {
			if (receipt.client._id) {
				clients.forEach(function (client) {
					if (client._id == receipt.client._id)
						$scope.source_client = client;
				});
			}
			$scope.select_client();
		});
		
		$scope.all_invoices = Invoice.query({ sort : '-created_at' }, function (invoices) {
			$scope.invoices = [];
			if ($scope.source_client) {
				invoices.forEach(function (invoice) {
					if (invoice.client._id == $scope.source_client._id)
						$scope.invoices.push(invoice);
				});
			}
			
			if (receipt.invoice_id) {
				invoices.forEach(function (invoice) {
					if (invoice._id == receipt.invoice_id)
						$scope.source_invoice = invoice;
				});
			}
		});
	});
	$scope.invoices = [];
	$scope.select_client = function () {
		if ($scope.source_client) {
			$('.client-details').hide();
			$('.edit-client-info').show();
			$scope.receipt.client._id     = $scope.source_client._id;
			$scope.receipt.client.name    = $scope.source_client.name;
			$scope.receipt.client.cif     = $scope.source_client.cif;
			$scope.receipt.client.address = $scope.source_client.address;
			$scope.receipt.client.city    = $scope.source_client.city;
			$scope.receipt.client.county  = $scope.source_client.county;
			$scope.receipt.client.country = $scope.source_client.country;
			
			$scope.invoices = [];
			$scope.all_invoices.forEach(function (invoice) {
				if (invoice.client._id == $scope.source_client._id)
					$scope.invoices.push(invoice);
			});
		} else {
			$scope.receipt.client._id = '';
			$scope.invoices = [];
			$('.client-details').show();
			$('.edit-client-info').hide();
		}
	};
	$scope.select_invoice = function () {
		if ($scope.source_invoice) {
			$scope.receipt.invoice_id  = $scope.source_invoice._id;
			$scope.receipt.value       = $scope.source_invoice._total();
			var date = $scope.source_invoice.date.getFullYear()+'-'+($scope.source_invoice.date.getMonth()+1)+'-'+$scope.source_invoice.date.getDate();
			$scope.receipt.description = 'Contravaloarea facturii ' + $scope.source_invoice.code + ' ' + $scope.source_invoice.number + ' din data de ' + date;
		} else {
			$scope.invoice_id  = null;
			$scope.value       = '';
			$scope.description = '';
		}
	};
	$scope.submit = function () {
		$scope.receipt.$save(function () {
			$location.path('/receipts');
		}, function (err) {
			console.log(err.data);
			alert(err.data.message);
		});
	};
}]);
