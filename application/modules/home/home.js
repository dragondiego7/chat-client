"use strict";

angular.module("chat.home", []).config(
[ "$routeProvider", function($routeProvider) {
	$routeProvider.when("/", {
		controller : "HomeController",
		templateUrl : "application/modules/home/partials/home.tpl.html"
	});
} ])
.controller("HomeController",
[ "$scope", "$http", "$location", "$cookies", "config", function($scope, $http, $location, $cookies, config) {

	var _this = this;

	var Contato = function(login) {
		this.login = login;
		this.status = 0;
		this.historico = [];
		this.msgsNaoLidas = 0;
	}

	// Obtém usuário logado
	$scope.usuario = $cookies.getObject("usuario");

	// Inicializa lista de contatos
	$scope.solicitacoesAmizade = [];
	$scope.resultadoPesquisa = [];
	$scope.contatos = [];

	// Inicializa destinatário
	$scope.destinatario = undefined;	
	
	/*
	 * Busca um contato do usuário
	 */
	var buscaContato = function(login, callback) {
		for ( var i in $scope.contatos) {
			if ($scope.contatos[i].login === login) {
				if (callback !== undefined)
					callback($scope.contatos[i]);
			}
		}
	}

	/*
	 * Emite sinal de presença a outros usuários
	 */
	var emitePresenca = function() {
		var presenca = {
			tipo : "mensagem-presenca",
			corpo : {
				"id": $scope.usuario.id,
				"login" : $scope.usuario.login,
				"status" : 1
			}
		}

		$scope.conn.emit("send-server", presenca);
	}

	/*
	 * Trata sinais de presença recebidos
	 */
	var recebePresenca = function(mensagemPresenca) {
		buscaContato(mensagemPresenca.corpo.login, function(contato) {
			contato.status = mensagemPresenca.corpo.status;
			$scope.$apply();
		});
	}

	/*
	 * Trata o recebimento de mensagens
	 */
	var recebeMensagem = function(mensagemChat) {
		$scope.contatos.forEach(function(contato, chave) {
			if(contato.login == mensagemChat.corpo.de) {
				$scope.contatos[chave].msgsNaoLidas++;
				mensagemChat.tipo = "mensagem-recebida";
				$scope.contatos[chave].historico.push(mensagemChat);
			}
		});
		
		$scope.$apply();
	}
	
	$scope.exibeContatos = function() {
		$('.col-left').toggleClass('hidden-xs');
		$('.col-right').toggleClass('hidden-xs');
	}

	/*
	 * Inicia uma conversa com um usuário
	 */
	$scope.iniciaConversa = function(loginDestinatario) {
		buscaContato(loginDestinatario, function(destinatario) {
			$('.col-left').toggleClass('hidden-xs');
			$('.col-right').toggleClass('hidden-xs');
			destinatario.msgsNaoLidas = 0;
			$scope.destinatario = destinatario;
		});
	}

	/*
	 * Envia uma mensagem a outro usuário
	 */
	$scope.enviaMensagem = function() {
		var objMensagem = $('#mensagem');
		var corpoMensagem = objMensagem.val()

		var mensagem = {
			tipo : 'mensagem-chat',
			corpo : {
				"de" : $scope.usuario.login,
				"para" : $scope.destinatario.login,
				"dtHrMensagem" : new Date(),
				"mensagem" : corpoMensagem
			}
		}

		$scope.conn.emit("send-server", mensagem);

		mensagem.tipo = "mensagem-enviada";
		buscaContato($scope.destinatario.login, function(destinatario) {
			destinatario.historico.push(mensagem);
		});

		objMensagem.val("");
		objMensagem.focus();
		
		var mensagens = $('#mensagens');
		
		mensagens.animate({'scrollTop': mensagens.prop('scrollHeight')}, 100);
	}
	
	$scope.procuraContato = function(contato) {
		// TODO: organizar o recebimento do parâmetro
		var contato = $scope.contatoProcurado;
		$scope.resultadoPesquisa = [];
		
		$('.carregandoProcurar').show();
		$http.get(config.API.url + "/amizade/busca/" + this.usuario.id + "/"  + contato).then(function(response) {
			response.data.usuarios.forEach(function(usuario) {
				var contato = new Contato(usuario.login);
				contato.id = usuario.id;
				contato.status = -1;
				contato.avatar = 'assets/img/anonimo.jpg';
				contato.solicitacaoPendente = usuario.solicitacaoPendente;
				$scope.resultadoPesquisa.push(contato);
			});
			
			$('.carregandoProcurar').hide();
		});
	}
	
	$scope.adicionaContato = function(contato) {	
		var request = {
			'solicitanteId': this.usuario.id,
			'solicitadoId': contato.id
		}
		
		$http.post(config.API.url + "/amizade/solicitacao", request).then(function(response) {
			var contaPisca = 0;
			var btnAdicionar = $('.btn-adicionar[data-contato-id="' + contato.id + '"]');
			btnAdicionar.html("solicitação enviada...");
			
			var interval = setInterval(function() {
				btnAdicionar.fadeOut(500, function() {
					btnAdicionar.fadeIn(500);
				});
				
				contaPisca++;
				if(contaPisca == 6) {
					clearInterval(interval);	
					$scope.resultadoPesquisa.forEach(function(c, chave) {
						if(c.id == contato.id) {
							var atualizaContato = new Contato(contato.login);
							atualizaContato.id = contato.id;
							atualizaContato.avatar = contato.avatar;
							atualizaContato.solicitacaoPendente = response.data.solicitacao;
							$scope.resultadoPesquisa[chave] = atualizaContato;
							$scope.$digest();
							btnAdicionar.html('adicionar');
						}
					});
				}
			}, 500);
			
		});
		
	}
	
	$scope.limpaBusca = function() {
		$scope.resultadoPesquisa = [];
		$scope.contatoProcurado = '';
	}
	
	$scope.respondeSolicitacaoAmizade = function(contato, situacao, callback) {
		var request = {
			'situacao': situacao
		};
		
		$http.put(config.API.url + "/amizade/solicitacao/" + contato.solicitacaoPendente.id, request).then(function(response) {
			callback();	
		});
	}
	
	$scope.aceitaSolicitacaoAmizade = function(contato) {
		$scope.respondeSolicitacaoAmizade(contato, 'A', function() {
			$scope.contatos.push(contato);
			$scope.solicitacoesAmizade.forEach(function(c, chave) {
				if(contato.id == c.id) {
					$scope.solicitacoesAmizade.splice(chave, 1);
				}
			});
		});
	}
	
	$scope.recusaSolicitacaoAmizade = function(contato) {
		$scope.respondeSolicitacaoAmizade(contato, 'R', function() {
			$scope.solicitacoesAmizade.forEach(function(c, chave) {
				if(contato.id == c.id) {
					$scope.solicitacoesAmizade.splice(chave, 1);
				}
			});
		});
	}
	
	$scope.cancelaSolicitacaoAmizade = function(contato) {
		$scope.respondeSolicitacaoAmizade(contato, 'C', function() {
			$scope.resultadoPesquisa.forEach(function(c, chave) {
				if(c.id == contato.id) {
					var atualizaContato = new Contato(contato.login);
					atualizaContato.id = contato.id;
					atualizaContato.avatar = contato.avatar;
					atualizaContato.solicitacaoPendente = null;
					$scope.resultadoPesquisa[chave] = atualizaContato;
					$scope.$digest();
				}
			});
		});
	}
	
	$scope.fechaSolicitacaoAmizade = function(contato) {
		contato.ignora = 1;
	}

	var carregaContatos = function(callback) {
		$http.get(config.API.url + "/amizade/" + $scope.usuario.id).then(function(response) {
			response.data.amizades.forEach(function(usuario) {
				var contato = new Contato(usuario.login);
				contato.avatar = usuario.avatar;
				$scope.contatos.push(contato);
			});
			
			callback();
		});
	}
	
	var carregaSolicitacoesAmizade = function() {
		$scope.solicitacoesAmizade = [];
		$http.get(config.API.url + "/amizade/solicitacao/" + $scope.usuario.id).then(function(response) {
			response.data.solicitacoes.forEach(function(solicitacao) {
				var usuario = solicitacao.usuario;
				var contato = new Contato(usuario.login);
				contato.id = usuario.id;
				contato.avatar = 'assets/img/anonimo.jpg';
				contato.solicitacaoPendente = solicitacao;
				$scope.solicitacoesAmizade.push(contato);
			});
		});
	}
	
	var conectaWebSocket = function() {
		$scope.conn = io.connect(config.SERVER.addr);
		
		var exibeMensagemErro = function() {
			$('#modal-msg-erro').modal();
		}
		
		$scope.conn.on("connect_timeout", function() {
			exibeMensagemErro();
		});
		
		$scope.conn.on("connect_error", function() {
			exibeMensagemErro();
		})
		
		$scope.conn.on("connect", function() {
			$scope.conn.on("mensagem-presenca", function(mensagemPresenca) {
				recebePresenca(mensagemPresenca);
			});
	
			$scope.conn.on("mensagem-chat", function(mensagemChat) {
				recebeMensagem(mensagemChat);
			});
			
			$scope.conn.on("mensagem-solicitacao-amizade", function() {
			});
	
			emitePresenca();
		});
	}
	
	$scope.logout = function() {
		$cookies.remove('access_token');
		$cookies.remove('refresh_token');
		$cookies.remove('usuario');
		location.reload();
	}
	
	/*
	 * Carrega contatos do usuário
	 */
	var inicia = function() {
		var promise = new Promise(function(resolve, reject) {
			carregaContatos(resolve);
		});
		
		promise.then(function() {
			conectaWebSocket();
			setInterval(function() {
				carregaSolicitacoesAmizade();
			}, 60 * 1000);
		});
	}
	
	inicia();
}]);