"use strict";

angular.module("chat",
		[ "ngRoute", "ngTouch", "chat.login", "chat.home" ])
		.constant("config", {
			"API": {
				"url": "http://192.168.0.150/api/public/index.php/v1",
				"credenciais": {
					"client_id": "clienteweb",
					"client_secret": "afat55"
				}
			},
			"SERVER": {
				"addr": "http://192.168.0.150:3000"
			}
		})
		.directive('myKeypressEnter', function() {
			return function(scope, element, attrs) {
				element.bind("keydown keypress", function(event) {
					if (event.which === 13) {
						scope.$apply(function() {
							scope.$eval(attrs.myKeypressEnter);
						});

						event.preventDefault();
					}
				});
			};
		}).directive('myPasswordCheck', function() {
			return {
				restrict: 'A',
				require: 'ngModel',
				link : function(scope, elem, attrs, ctrl) {
		            if (!attrs.myPasswordCheck) {
		                console.error('myPasswordCheck expects a model as an argument!');
		                return;
		            }
		            
		            scope.$watch(attrs.myPasswordCheck, function (value) {
		                ctrl.$setValidity('myPasswordCheck', value === ctrl.$viewValue);
		            });
		            
		            ctrl.$parsers.push(function (value) {
		                var isValid = value === scope.$eval(attrs.myPasswordCheck);
		                ctrl.$setValidity('myPasswordCheck', isValid);
		                return isValid ? value : undefined;
		            });
				}
			};
		});
