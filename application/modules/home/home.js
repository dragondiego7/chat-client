"use strict";

angular.module("chat.home", []).config(
[ "$routeProvider", function($routeProvider) {
	$routeProvider.when("/", {
		controller : "HomeController",
		templateUrl : "application/modules/home/partials/home.tpl.html"
	});
}])
.controller("HomeController",
[ "$scope", "$http", "$location", "config", function($scope, $http, $location, config) {

	var _this = this;
	var limit = 10;
	var offset = 0;
	var carregandoMensagens = false;

	var Contato = function(login) {
		this.id;
		this.login = login;
		this.status = 0;
		this.historico = [];
		this.historicoOffset = 0;
		this.msgsNaoLidas = 0;
	}

	// Obtém usuário logado
	$scope.usuario = JSON.parse(localStorage.getItem("usuario"));
	
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
			if(contato.id == mensagemChat.corpo.de) {
				$scope.contatos[chave].msgsNaoLidas++;
				mensagemChat.tipo = "mensagem-recebida";
				$scope.contatos[chave].historico.push(mensagemChat);
				$scope.contatos[chave].historicoOffset++;
			}
		});
		
		$scope.$apply();
	}
	
	$scope.exibeContatos = function() {
		$('.col-left').toggleClass('hidden-xs');
		$('.col-right').toggleClass('hidden-xs');
	}

	var carregaHistorico = function(loginDestinatario, limit, offset, callback) {
		carregandoMensagens = true;
		$(".carregandoMensagens").show();
		
		$http.get(config.API.url + "/historico/" + $scope.usuario.id + "/" + $scope.destinatario.id + '/' + limit + '/' + offset).then(function(resposta) {
			var mensagens = resposta.data.mensagens;
			
			if(mensagens.length > 0) {
				buscaContato(loginDestinatario, function(destinatario) {
					mensagens.forEach(function(mensagem, i){					
						var objMensagem = {
							tipo: 'mensagem-chat',
							corpo: {
								"de": mensagem.remetente_id,
								"para": mensagem.destinatario_id,
								"dtHrMensagem": mensagem.criado_em,
								"mensagem": mensagem.mensagem
							}
						}
						
						if(mensagem.remetente_id == $scope.usuario.id) {
							objMensagem.tipo = 'mensagem-enviada';
						} else {
							objMensagem.tipo = 'mensagem-recebida';
						}
						
						destinatario.historico.unshift(objMensagem);
						
						if(mensagens.length - 1 == i) {
							carregandoMensagens = false;
							$(".carregandoMensagens").hide();
							
							if(callback !== undefined) {
								callback();
							}
						}
						
						destinatario.historicoOffset++;
					});
				});
			} else {
				carregandoMensagens = false;
				$(".carregandoMensagens").hide();
				
				if(callback !== undefined) {
					callback();
				}
			} 
		});
	}
	
	// Carrega histórico dinamicamente
	$("#mensagens").scroll(function() {
		var _this = $(this);
		if($(this).prop('scrollTop') == 0 && carregandoMensagens == false) {
			carregaHistorico($scope.destinatario.login, 10, $scope.destinatario.historicoOffset, function() {
				_this.animate({'scrollTop': 20}, 100);
			});
		}
	});
	
	/*
	 * Inicia uma conversa com um usuário
	 */
	$scope.iniciaConversa = function(loginDestinatario) {
		buscaContato(loginDestinatario, function(destinatario) {
			$('.col-left').toggleClass('hidden-xs');
			$('.col-right').toggleClass('hidden-xs');
			destinatario.msgsNaoLidas = 0;
			$scope.destinatario = destinatario;
			
			carregaHistorico(loginDestinatario, 10, 0, function() {
				setTimeout(function() {
					var divMensagens = $("#mensagens");
					divMensagens.scrollTop(1000);
				}, 100);
			});
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
				"de" : $scope.usuario.id,
				"para" : $scope.destinatario.id,
				"dtHrMensagem" : new Date(),
				"mensagem" : corpoMensagem
			}
		}
		
		$scope.conn.emit("send-server", mensagem);

		mensagem.tipo = "mensagem-enviada";
		buscaContato($scope.destinatario.login, function(destinatario) {
			destinatario.historico.push(mensagem);
			destinatario.historicoOffset++;
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
		$http.get(config.API.url + "/amizade/busca/" + $scope.usuario.id + "/"  + contato).then(function(response) {
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
				contato.id = usuario.id;
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
		localStorage.removeItem("access_token");
		localStorage.removeItem("refresh_token");
		localStorage.removeItem("usuario");
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