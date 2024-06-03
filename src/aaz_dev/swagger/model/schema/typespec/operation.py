from schematics.models import Model
from schematics.types import StringType, ModelType, BooleanType
from ..fields import BooleanType
# from ..x_ms_pageable import XmsPageableField

from command.model.configuration import CMDHttpOperation


class TypeSpecOperation(Model):
    operation_id = StringType(
        serialized_name="operationId",
        deserialize_from="operationId",
    )  # Unique string used to identify the operation. The id MUST be unique among all operations described in the API. Tools and libraries MAY use the operationId to uniquely identify an operation, therefore, it is recommended to follow common programming naming conventions.

    x_ms_pageable = BooleanType()
    # x_ms_examples = XmsExamplesField()  # TODO:

    # MutabilityEnum.Read
    read = ModelType(CMDHttpOperation)
    # MutabilityEnum.Create
    create = ModelType(CMDHttpOperation)
    # MutabilityEnum.Update
    update = ModelType(CMDHttpOperation)
