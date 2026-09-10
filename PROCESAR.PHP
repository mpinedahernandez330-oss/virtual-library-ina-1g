
<?php
header('Content-Type: application/json');

// Conexión automática a su entorno Laragon
$servidor = "localhost";
$usuario_db = "root";
$password_db = "";
$nombre_db = "virtual_library"; // Base de datos corregida de la captura

$conexion = new mysqli($servidor, $usuario_db, $password_db, $nombre_db);

if ($conexion->connect_error) {
    echo json_encode(["error" => "Conexión fallida a la base de datos"]);
    exit();
}

$accion = $_GET['accion'] ?? '';

// Operación: Consultar si ya gastó el mes gratis
if ($accion == 'verificar') {
    $id = intval($_GET['id']);
    $resultado = $conexion->query("SELECT uso_prueba FROM usuarios WHERE id = $id");
    $usuario = $resultado->fetch_assoc();
    echo json_encode($usuario ? $usuario : ["uso_prueba" => 0]);
    exit();
}

// Operación: Cambiar plan y asignar los 30 días de vigencia en la BD
if ($accion == 'suscribir') {
    $datosRecibidos = json_decode(file_get_contents('php://input'), true);
    
    $id = intval($datosRecibidos['id']);
    $plan = $conexion->real_escape_string($datosRecibidos['plan']);
    $tipo = $datosRecibidos['tipo']; 

    // Calcula 30 días a partir de hoy
    $fechaVencimiento = date('Y-m-d', strtotime('+30 days'));

    if ($tipo == 'prueba') {
        // Guarda el plan y bloquea futuras pruebas marcando uso_prueba = 1
        $sql = "UPDATE usuarios SET plan='$plan', fecha_vencimiento='$fechaVencimiento', uso_prueba=1 WHERE id=$id";
    } else {
        // Pago regular: Solo extiende la vigencia y actualiza el tipo de plan
        $sql = "UPDATE usuarios SET plan='$plan', fecha_vencimiento='$fechaVencimiento' WHERE id=$id";
    }

    if ($conexion->query($sql) === TRUE) {
        echo json_encode(["exito" => true, "vencimiento" => $fechaVencimiento]);
    } else {
        echo json_encode(["exito" => false]);
    }
    exit();
}
?>
