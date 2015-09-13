"use strict";

angular.module("chat.home", []).config(
		[ "$routeProvider", function($routeProvider) {
			$routeProvider.when("/", {
				controller : "HomeController",
				templateUrl : "application/modules/home/partials/home.tpl.html"
			});
		} ]).controller("HomeController",
		[ "$scope", "$http", "$cookies", function($scope, $http, $cookies) {

			$scope.usuario = $cookies.getObject("usuario");

			$http.get('api/v1/usuario.json').then(function(response) {
				$scope.contatos = response.data.usuarios;
			});

			$scope.conn = io.connect("http://192.168.0.103:3000");
			$scope.conn.on("connect", function() {
				$scope.conn.on("mensagem-presenca", function(mensagem) {
					for ( var i in $scope.contatos) {
						if ($scope.contatos[i].login === mensagem.corpo.login) {
							$scope.contatos[i].status = 1;
							$scope.$apply();
							break;
						}
					}
				});

				var presenca = {
					tipo : "mensagem-presenca",
					corpo : {
						"login" : $scope.usuario.login,
						"status" : 1
					}
				}

				$scope.conn.emit("send-server", presenca);
			});

			$scope.destinatario = undefined;

			$scope.iniciaConversa = function(destinatario) {
				$('.contatos').toggleClass('hidden-xs');
				$('.chat').toggleClass('hidden-xs');
				$scope.destinatario = destinatario;
			}

			$scope.enviaMensagem = function() {
				var objMensagem = $('#mensagem');
				var corpoMensagem = objMensagem.val()
				var destinatario = $scope.destinatario.login;

				var mensagem = {
					tipo : 'mensagem-chat',
					corpo : {
						"de" : 'meulogin',
						"para" : destinatario,
						"mensagem" : corpoMensagem
					}
				}

				$scope.conn.send("send-server", mensagem);
				objMensagem.val("");
			}
		} ]);