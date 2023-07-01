(define-constant CONTRACT_OWNER tx-sender)
(define-constant GAME_UNINITIALIZED 0)
(define-constant GAME_PING 2)
(define-constant GAME_PONG 3)
(define-constant ERR_GAME_NOT_STARTED (err "Game not started"))
(define-constant ERR_GAME_STARTED (err "Game in progress"))
(define-constant ERR_NOT_YOUR_TURN (err "Not your turn to move."))
(define-constant ERR_NOT_THE_OWNER (err "Not the owner"))
(define-constant ERR_MISSING_DATA (err "500: Missing data"))
(define-constant ERR_SELF_PLAY (err "self-play"))

(define-data-var next_player bool false)
(define-map player_data bool (tuple (who principal) (count uint)))
(define-data-var state int GAME_UNINITIALIZED)

(define-read-only (player-info (who bool)) (map-get? player_data who))
(define-read-only (game-state) (var-get state))


;; #[allow(unchecked_data)]
(define-public (new-game (player1 principal) (player2 principal)) (begin 
(asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_THE_OWNER)
(asserts! (< (var-get state) GAME_PING) ERR_GAME_STARTED)
(asserts! (not (is-eq player1 player2)) ERR_SELF_PLAY)
(var-set next_player false)
(map-set player_data false (tuple (who player1) (count u0)))
(map-set player_data true (tuple (who player2) (count u0)))
(var-set state GAME_PING)
(ok "New Game!") )
)

(define-public (end-game) (begin 
(asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_THE_OWNER)
(if (> (var-get state) GAME_UNINITIALIZED) 
    (begin 
        (var-set state GAME_UNINITIALIZED)
        (map-delete player_data false)
        (map-delete player_data true)
         none)
    none)
(ok "Game reset!"))
)

(define-public (play) (begin
    (asserts! (>= (var-get state) GAME_PING) ERR_GAME_NOT_STARTED)
    (let (
            (caller_info (unwrap-panic (map-get? player_data (var-get next_player))))
            (oponent_info (unwrap-panic (map-get? player_data (not (var-get next_player)))))
            (new_count (tuple (count (+ (get count caller_info) u1))))
        )
        (asserts! (is-eq (get who caller_info) tx-sender) ERR_NOT_YOUR_TURN)
        (map-set player_data (var-get next_player) (merge new_count caller_info))
        (print new_count)
        (print (merge caller_info new_count))
        (print (player-info (var-get next_player)))
        (var-set next_player (not (var-get next_player)))
    )
 (ok "Cool!")))
