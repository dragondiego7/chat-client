"use strict";

angular.module("chat.login", [])
.controller("LoginController", ["$scope", "$http", "$location", "config", function($scope, $http, $location, config) {
		
	// Verifica se o usuário está logado
	var access_token = localStorage.getItem("access_token");
	if (access_token != null) {
		$location.path("/");
	}
	
	$scope.entrar = function(usuarioLogin) {
		var request = {
			url: config.API.url + '/autenticacao',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			data: $.param({
				"grant_type": "password",
				"login": usuarioLogin.login,
				"senha": usuarioLogin.senha,
				"client_id": config.API.credenciais.client_id,
				"client_secret": config.API.credenciais.client_secret
			})
		}
		
		$http(request).then(function(response) {
			if(response.data.access_token !== undefined) {
				localStorage.setItem("access_token", response.data.access_token);
				localStorage.setItem("refres_token", response.data.refresh_token);
				
				usuarioLogin.id = response.data.user_id;
				delete usuarioLogin.senha;
				
				localStorage.setItem("usuario", JSON.stringify(usuarioLogin));
				$location.path("/");
			}
			
			$scope.loginErrorMsg = "Login/senha inválido";
		}, function() {
			$scope.loginErrorMsg = "Serviço temporáriamente indisponível";
		});
	}
	
	$scope.cadastrar = function(usuario) {
		var copiaDeUsuario = angular.copy(usuario);
		delete copiaDeUsuario.confirmaSenha;
		
		$http.post(config.API.url + '/usuario', copiaDeUsuario).then(function(response) {
			if(response.data.success) {
				$scope.entrar(usuario);
			} else {
				$scope.cadastrarErrorMsg = response.data.mensagem;
			}
		}, function() {
			$scope.cadastrarErrorMsg = "Serviço temporáriamente indisponível";
		});
	}
}])
.config(["$routeProvider", "$httpProvider",
function($routeProvider, $httpProvider) {
	$routeProvider.when("/login", {
		controller: "LoginController",
		templateUrl: "application/modules/login/partials/login.tpl.html"
	});
		
	// Adiciona uma função ao interceptador de requisições para verificar se o usuário está lgado
	$httpProvider.interceptors.push(["$q", "$location",
	function($q, $location) {
		return {
			'request' : function(config) {				
				// Verifica se o usuário está logado
				var access_token = localStorage.getItem("access_token");
				
				if (access_token === null) {
					$location.path("/login");
				}
				
				// Caso ele esteja, adicionar o token ao header de todas as requisições
				$httpProvider.defaults.headers.common['Authorization'] = 'Bearer ' + access_token;
				return config;
			}
		};
	}]);
}]); 