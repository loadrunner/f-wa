"use strict";
var app = angular.module('facturi.receipts', ['ngRoute', 'ngResource']);

app.config(['$routeProvider', function($routeProvider) {
	$routeProvider
	.when('/receipts', {
		templateUrl : 'templates/receipts/index.html',
		controller : 'ReceiptsController'
	}).when('/receipts/show', {
		templateUrl : 'templates/receipts/get.html',
		controller : 'GetReceiptController'
	}).when('/receipts/add', {
		templateUrl : 'templates/receipts/add.html',
		controller : 'AddReceiptController'
	}).when('/receipts/edit', {
		templateUrl : 'templates/receipts/edit.html',
		controller : 'EditReceiptController'
	});
}]);

app.factory('Receipt', function($resource) {
	return $resource('/api/receipts/:_id', {
		_id : "@_id"
	}, {
		get : {
			method  : 'GET',
			headers : {
				'Authorization' : 'Bearer ' + localStorage.access_token
			}
		}, insert : {
			method  : 'POST',
			headers : {
				'Authorization' : 'Bearer ' + localStorage.access_token
			}
		}, save : {
			method  : 'PUT',
			headers : {
				'Authorization' : 'Bearer ' + localStorage.access_token
			}
		}, remove : {
			method  : 'DELETE',
			headers : {
				'Authorization' : 'Bearer ' + localStorage.access_token
			}
		}, query : {
			method  : 'GET',
			isArray : true,
			headers : {
				'Authorization' : 'Bearer ' + localStorage.access_token
			}
		}
	});
});

app.controller('ReceiptsController', ['$scope', '$location', 'Receipt', function($scope, $location, Receipt) {
	$scope.message = 'This is list receipts screen';
	$scope.menuClass = function (page) {
		var current = $location.path();
		return current.match('^\/receipts(\/)?'+page+'$') ? "active" : "";
	};
	$scope.receipts = Receipt.query();
	$scope.remove = function (id) {
		Receipt.remove({ _id : id }, function (r) {
			console.log(r);
			for (var i = 0; i < $scope.receipts.length; i++)
				if ($scope.receipts[i]._id == id) {
					$scope.receipts.splice(i, 1);
					break;
				}
		});
	};
}]);

app.controller('GetReceiptController', ['$scope', '$location', '$routeParams', 'Receipt', function($scope, $location, $routeParams, Receipt) {
	$scope.message = 'This is show receipt screen';
	$scope.receipt = Receipt.get({_id : $routeParams.id});
}]);

app.controller('AddReceiptController', ['$scope', '$location', 'Receipt', function($scope, $location, Receipt) {
	$scope.message = 'This is add receipt screen';
	$scope.submit = function () {
		if (!$scope.name || $scope.name.length < 1)
			return;
		
		var receipt = new Receipt({
			value : $scope.value
		});
		receipt.$insert(function (res) {
			if (res.$resolved !== true)
				return;
			
			$location.path('/receipts');
		});
	};
}]);

app.controller('EditReceiptController', ['$scope', '$location', '$routeParams', 'Receipt', function($scope, $location, $routeParams, Receipt) {
	$scope.message = 'This is edit receipt screen';
	$scope.receipt = Receipt.get({_id : $routeParams.id});
	$scope.submit = function () {
		$scope.receipt.$save(function () {
			$location.path('/receipts');
		});
	};
}]);
